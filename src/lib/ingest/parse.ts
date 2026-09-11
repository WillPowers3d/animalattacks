import type { NewsItem } from "./news";
import type { SeedIncident, Severity } from "../types";
import { geocodeIncident, offsetCoord } from "../geo";

const STATE_RE: [RegExp, string, SeedIncident["country"]][] = [
  [/\bAlaska\b/i, "AK", "US"],
  [/\bMontana\b/i, "MT", "US"],
  [/\bWyoming\b/i, "WY", "US"],
  [/\bIdaho\b/i, "ID", "US"],
  [/\bColorado\b/i, "CO", "US"],
  [/\bCalifornia\b/i, "CA", "US"],
  [/\bWashington\b/i, "WA", "US"],
  [/\bOregon\b/i, "OR", "US"],
  [/\bFlorida\b/i, "FL", "US"],
  [/\bArizona\b/i, "AZ", "US"],
  [/\bNew Mexico\b/i, "NM", "US"],
  [/\bUtah\b/i, "UT", "US"],
  [/\bNevada\b/i, "NV", "US"],
  [/\bTennessee\b/i, "TN", "US"],
  [/\bMaine\b/i, "ME", "US"],
  [/\bMinnesota\b/i, "MN", "US"],
  [/\bWisconsin\b/i, "WI", "US"],
  [/\bMichigan\b/i, "MI", "US"],
  [/\bNew York\b/i, "NY", "US"],
  [/\bBritish Columbia\b/i, "BC", "CA"],
  [/\bAlberta\b/i, "AB", "CA"],
  [/\bManitoba\b/i, "MB", "CA"],
  [/\bOntario\b/i, "ON", "CA"],
  [/\bYukon\b/i, "YT", "CA"],
  [/\bMexico\b/i, "", "MX"],
];

function inferSeverity(text: string): Severity {
  if (/\b(killed|dead|dies|fatal|fatally)\b/i.test(text)) return "fatal";
  if (/\b(injur|maul|gored|trampled|hospital|bitten|wound)\b/i.test(text)) return "injury";
  if (/\b(home|cabin|property|break-in|livestock|pet)\b/i.test(text)) return "property";
  return "near_miss";
}

function inferFirearm(text: string): Pick<
  SeedIncident,
  "firearmType" | "caliber" | "defenseOutcome" | "combinationDefense"
> {
  const combination = /handgun.{0,20}(rifle|shotgun)|rifle.{0,20}handgun/i.test(text);
  if (/bear spray|pepper spray/i.test(text) && !/pistol|handgun|shot/i.test(text)) {
    return { firearmType: "spray", defenseOutcome: "success", combinationDefense: false };
  }
  if (/handgun|pistol|revolver|sidearm/i.test(text)) {
    return { firearmType: "handgun", defenseOutcome: "success", combinationDefense: combination };
  }
  if (/rifle/i.test(text)) {
    return { firearmType: "rifle", defenseOutcome: "success", combinationDefense: combination };
  }
  if (/shotgun/i.test(text)) {
    return { firearmType: "shotgun", defenseOutcome: "success", combinationDefense: combination };
  }
  return { firearmType: null, combinationDefense: false };
}

function inferLocation(text: string) {
  for (const [re, abbr, country] of STATE_RE) {
    if (re.test(text)) {
      return { stateProvince: abbr || null, country };
    }
  }
  if (/\bCanada\b/i.test(text)) return { stateProvince: null, country: "CA" as const };
  return { stateProvince: null, country: "US" as const };
}

export function heuristicParse(item: NewsItem): SeedIncident {
  const blob = `${item.title}\n${item.contentSnippet ?? ""}`;
  const loc = inferLocation(blob);
  const gun = inferFirearm(blob);
  const cityMatch = item.title.match(
    /\b(?:in|near|outside)\s+([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)?)/,
  );
  const city = cityMatch?.[1] ?? null;
  const geo = offsetCoord(geocodeIncident({ city, ...loc }), item.title);
  const occurredAt = item.isoDate ? item.isoDate.slice(0, 10) : null;

  return {
    title: item.title.slice(0, 180),
    species: item.species,
    subspecies: /grizzly|brown bear/i.test(blob)
      ? "grizzly"
      : /black bear/i.test(blob)
        ? "black"
        : /polar/i.test(blob)
          ? "polar"
          : /cougar|mountain lion/i.test(blob)
            ? "cougar"
            : null,
    occurredAt,
    datePrecision: occurredAt ? "exact" : "unknown",
    dateDisplay: occurredAt ?? "Date unknown",
    city,
    stateProvince: loc.stateProvince,
    country: loc.country,
    lat: geo.lat,
    lng: geo.lng,
    severity: inferSeverity(blob),
    summary: (item.contentSnippet ?? item.title).slice(0, 900),
    sourceType: "news",
    verified: false,
    ...gun,
    attribution: "Ingested from Google News RSS. Heuristic parse — not official agency data.",
    sources: [
      {
        url: item.url,
        title: item.title,
        publisher: item.source ?? "Google News",
      },
    ],
  };
}

export async function maybeEnrichWithOpenAI(inc: SeedIncident): Promise<SeedIncident> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return inc;
  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: key });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract animal-attack fields as JSON: city, stateProvince (2-letter if US/CA), country (US|CA|MX), subspecies, severity (fatal|injury|near_miss|property), firearmType (handgun|rifle|shotgun|spray|none|unknown|null), caliber, shotsFired (number|null), summary (2 sentences). Do not invent facts.",
        },
        { role: "user", content: `${inc.title}\n${inc.summary}` },
      ],
    });
    const raw = res.choices[0]?.message?.content;
    if (!raw) return inc;
    const parsed = JSON.parse(raw) as Partial<SeedIncident>;
    const merged: SeedIncident = {
      ...inc,
      ...parsed,
      title: inc.title,
      species: inc.species,
      sources: inc.sources,
      sourceType: inc.sourceType,
    };
    const geo = offsetCoord(geocodeIncident(merged), merged.title);
    return { ...merged, lat: geo.lat, lng: geo.lng };
  } catch (err) {
    console.warn("OpenAI enrichment skipped:", err);
    return inc;
  }
}
