import { geocodeIncident, offsetCoord } from "../geo";
import type { SeedIncident, Species } from "../types";
import { matchAnimalAttack } from "./match";
import type { ArticleCandidate } from "./types";

const STATE_RE: [RegExp, string][] = [
  [/\bAlaska\b|\bAK\b/, "AK"],
  [/\bMontana\b|\bMT\b/, "MT"],
  [/\bWyoming\b|\bWY\b/, "WY"],
  [/\bIdaho\b|\bID\b/, "ID"],
  [/\bColorado\b|\bCO\b/, "CO"],
  [/\bCalifornia\b|\bCA\b/, "CA"],
  [/\bWashington\b|\bWA\b/, "WA"],
  [/\bOregon\b|\bOR\b/, "OR"],
  [/\bArizona\b|\bAZ\b/, "AZ"],
  [/\bNew Mexico\b|\bNM\b/, "NM"],
  [/\bUtah\b|\bUT\b/, "UT"],
  [/\bNevada\b|\bNV\b/, "NV"],
  [/\bMaine\b|\bME\b/, "ME"],
  [/\bMinnesota\b|\bMN\b/, "MN"],
  [/\bWisconsin\b|\bWI\b/, "WI"],
  [/\bMichigan\b|\bMI\b/, "MI"],
  [/\bNew York\b|\bNY\b/, "NY"],
  [/\bNew Hampshire\b|\bNH\b/, "NH"],
  [/\bVermont\b|\bVT\b/, "VT"],
  [/\bPennsylvania\b|\bPA\b/, "PA"],
  [/\bTennessee\b|\bTN\b/, "TN"],
  [/\bNorth Carolina\b|\bNC\b/, "NC"],
  [/\bVirginia\b|\bVA\b/, "VA"],
  [/\bFlorida\b|\bFL\b/, "FL"],
  [/\bTexas\b|\bTX\b/, "TX"],
  [/\bOhio\b|\bOH\b/, "OH"],
  [/\bGeorgia\b|\bGA\b/, "GA"],
  [/\bIllinois\b|\bIL\b/, "IL"],
  [/\bMassachusetts\b|\bMA\b/, "MA"],
];

function inferSeverity(text: string): SeedIncident["severity"] {
  if (/\b(killed|dead|dies|fatal|fatally|died)\b/i.test(text)) return "fatal";
  if (/\b(injur|maul|gored|trampled|hospital|bitten|wound|clawed)\b/i.test(text)) return "injury";
  if (/\b(home|cabin|property|break-in|livestock|pet)\b/i.test(text)) return "property";
  return "near_miss";
}

function inferSubspecies(species: Species, text: string): string | null {
  if (species === "bear") {
    if (/grizzly|brown bear/i.test(text)) return "grizzly";
    if (/black bear/i.test(text)) return "black";
    if (/polar/i.test(text)) return "polar";
  }
  if (species === "mountain_lion") return "cougar";
  return null;
}

export type PublicationLocation = {
  id: string;
  name: string;
  town?: string | null;
  city?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export function articleToIncident(
  article: ArticleCandidate,
  pub: PublicationLocation,
): SeedIncident | null {
  const match = matchAnimalAttack(article.title, article.snippet);
  if (!match.matched) return null;

  const blob = `${article.title}\n${article.snippet}`;
  const cityState = blob.match(
    /\b([A-Z][A-Za-z]+(?:[ \t][A-Z][A-Za-z]+)?),\s*([A-Z]{2})\b/,
  );
  const cityMatch = blob.match(
    /\b(?:in|near|outside|at)[ \t]+([A-Z][A-Za-z]+(?:[ \t][A-Z][A-Za-z]+)?)/,
  );
  const cityFromArticle = (cityState?.[1] ?? cityMatch?.[1] ?? null)?.replace(/\s+/g, " ").trim() ?? null;
  let stateFromArticle: string | null = cityState?.[2] ?? null;
  if (!stateFromArticle) {
    for (const [re, abbr] of STATE_RE) {
      if (re.test(`${article.title}`)) {
        stateFromArticle = abbr;
        break;
      }
    }
  }

  const city = cityFromArticle ?? pub.city ?? pub.town ?? null;
  const state = stateFromArticle ?? pub.state ?? null;
  const hasPrecisePlace = Boolean(cityFromArticle);
  let lat = pub.lat ?? null;
  let lng = pub.lng ?? null;
  if (hasPrecisePlace || lat == null || lng == null) {
    const geo = offsetCoord(geocodeIncident({ city, stateProvince: state, country: "US" }), article.title);
    if (hasPrecisePlace || lat == null) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  const occurredAt = article.isoDate ? article.isoDate.slice(0, 10) : null;
  const snippet = (article.snippet || article.title).slice(0, 400);

  return {
    title: article.title.slice(0, 180),
    species: match.species,
    subspecies: inferSubspecies(match.species, blob),
    occurredAt,
    datePrecision: occurredAt ? "exact" : "unknown",
    dateDisplay: occurredAt ?? "Date unknown",
    city,
    stateProvince: state,
    country: "US",
    lat,
    lng,
    severity: inferSeverity(blob),
    summary: snippet,
    sourceType: "news",
    verified: false,
    attribution: `Local newspaper crawl: ${pub.name}. Snippet only — not official agency data.`,
    publicationId: pub.id,
    sources: [
      {
        url: article.url,
        title: article.title,
        publisher: pub.name,
      },
    ],
  };
}
