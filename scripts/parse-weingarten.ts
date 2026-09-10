/**
 * Parse Dean Weingarten / Ammoland / Gun Watch public articles into seed incidents.
 * Re-run: npm run parse:weingarten
 */
import fs from "node:fs";
import path from "node:path";
import type { Country, SeedIncident, Severity } from "../src/lib/types";
import { geocodeIncident, offsetCoord } from "../src/lib/geo";

const ROOT = path.join(import.meta.dirname, "..");
const SOURCES = path.join(ROOT, "data/sources");
const OUT = path.join(ROOT, "data/weingarten-incidents.json");

const STATE_MAP: Record<string, { abbr: string; country: Country }> = {
  alabama: { abbr: "AL", country: "US" },
  alaska: { abbr: "AK", country: "US" },
  arizona: { abbr: "AZ", country: "US" },
  arkansas: { abbr: "AR", country: "US" },
  california: { abbr: "CA", country: "US" },
  colorado: { abbr: "CO", country: "US" },
  connecticut: { abbr: "CT", country: "US" },
  delaware: { abbr: "DE", country: "US" },
  florida: { abbr: "FL", country: "US" },
  georgia: { abbr: "GA", country: "US" },
  idaho: { abbr: "ID", country: "US" },
  illinois: { abbr: "IL", country: "US" },
  indiana: { abbr: "IN", country: "US" },
  iowa: { abbr: "IA", country: "US" },
  kansas: { abbr: "KS", country: "US" },
  kentucky: { abbr: "KY", country: "US" },
  louisiana: { abbr: "LA", country: "US" },
  maine: { abbr: "ME", country: "US" },
  maryland: { abbr: "MD", country: "US" },
  massachusetts: { abbr: "MA", country: "US" },
  michigan: { abbr: "MI", country: "US" },
  minnesota: { abbr: "MN", country: "US" },
  mississippi: { abbr: "MS", country: "US" },
  missouri: { abbr: "MO", country: "US" },
  montana: { abbr: "MT", country: "US" },
  nebraska: { abbr: "NE", country: "US" },
  nevada: { abbr: "NV", country: "US" },
  "new hampshire": { abbr: "NH", country: "US" },
  "new jersey": { abbr: "NJ", country: "US" },
  "new mexico": { abbr: "NM", country: "US" },
  "new york": { abbr: "NY", country: "US" },
  "north carolina": { abbr: "NC", country: "US" },
  "north dakota": { abbr: "ND", country: "US" },
  ohio: { abbr: "OH", country: "US" },
  oklahoma: { abbr: "OK", country: "US" },
  oregon: { abbr: "OR", country: "US" },
  pennsylvania: { abbr: "PA", country: "US" },
  "rhode island": { abbr: "RI", country: "US" },
  "south carolina": { abbr: "SC", country: "US" },
  "south dakota": { abbr: "SD", country: "US" },
  tennessee: { abbr: "TN", country: "US" },
  texas: { abbr: "TX", country: "US" },
  utah: { abbr: "UT", country: "US" },
  vermont: { abbr: "VT", country: "US" },
  virginia: { abbr: "VA", country: "US" },
  washington: { abbr: "WA", country: "US" },
  "west virginia": { abbr: "WV", country: "US" },
  wisconsin: { abbr: "WI", country: "US" },
  wyoming: { abbr: "WY", country: "US" },
  "british columbia": { abbr: "BC", country: "CA" },
  alberta: { abbr: "AB", country: "CA" },
  manitoba: { abbr: "MB", country: "CA" },
  ontario: { abbr: "ON", country: "CA" },
  yukon: { abbr: "YT", country: "CA" },
  "northwest territories": { abbr: "NT", country: "CA" },
  nunavut: { abbr: "NU", country: "CA" },
  quebec: { abbr: "QC", country: "CA" },
  saskatchewan: { abbr: "SK", country: "CA" },
  norway: { abbr: "SV", country: "NO" },
  svalbard: { abbr: "SV", country: "NO" },
  germany: { abbr: "HE", country: "DE" },
  russia: { abbr: "RU", country: "RU" },
};

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12,
};

const SOURCE_META: Record<string, { url: string; title: string }> = {
  "gunwatch-2021-06-104-cases.txt": {
    url: "http://gunwatch.blogspot.com/2021/06/using-handguns-or-pistols-in-defense.html",
    title: "Using Handguns or Pistols in Defense Against Bears — 104 cases (June 2021)",
  },
  "ammoland-2022-03-combination.txt": {
    url: "https://www.ammoland.com/2022/03/update-of-pistol-or-handgun-defenses-against-bears/",
    title: "Update of Pistol or Handgun Defenses Against Bears — combination cases (March 2022)",
  },
  "ammoland-2022-04-123-cases.txt": {
    url: "https://www.ammoland.com/2022/04/update-of-pistol-defenses-against-bears-123-cases-98-effective/",
    title: "Update of Pistol Defenses Against Bears — 123 cases (April 2022)",
  },
  "ammoland-2023-11-170-cases.txt": {
    url: "https://www.ammoland.com/2023/11/handgun-defenses-against-bears-170-documented-incidents-98-effective/",
    title: "Handgun Defenses Against Bears — 170 documented incidents (November 2023)",
  },
  "ammoland-2024-05-190-cases.txt": {
    url: "https://www.ammoland.com/2024/05/bear-defense-with-handguns-update-20-more-cases-98-effective/",
    title: "Bear Defense with Handguns Update — 20 more cases (May 2024)",
  },
  "ammoland-2025-10-205-cases.txt": {
    url: "https://www.ammoland.com/2025/10/handguns-proven-98-effective-in-205-documented-bear-attacks/",
    title: "Handguns Proven 98% Effective in 205 Documented Bear Attacks (October 2025)",
  },
};

function detectCaliber(text: string): string | null {
  const patterns = [
    /\.500\s*(?:s&w|smith)?\s*mag(?:num)?/i,
    /\.460\s*(?:s&w|smith)?\s*mag(?:num)?/i,
    /\.454\s*casull/i,
    /\.45\s*(?:super|colt|long colt|acp|auto)/i,
    /\.45\s*colt\/\.410/i,
    /\.44-40/i,
    /\.44\s*mag(?:num)?/i,
    /\.41\s*mag(?:num)?/i,
    /10\s*mm/i,
    /\.40(?:\s*(?:s&w|cal(?:iber)?))?/i,
    /\.357\s*mag(?:num)?/i,
    /\.38(?:\s*(?:special|s&w))?/i,
    /\.380/i,
    /9(?:\s*mm|\.3)/i,
    /\.22(?:\s*(?:lr|mag(?:num)?|rimfire|calibre|caliber))?/i,
    /\.45\s*magnum/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const raw = m[0].replace(/\s+/g, " ").trim();
      if (/10\s*mm/i.test(raw)) return "10mm";
      if (/9\s*mm/i.test(raw)) return "9mm";
      if (/\.40/i.test(raw) && !/\.41|\.44|\.45|\.454|\.460/.test(raw)) return ".40 S&W";
      if (/\.38/i.test(raw)) return ".38 Special";
      if (/\.22\s*mag/i.test(raw)) return ".22 Magnum";
      if (/\.22/i.test(raw)) return ".22 LR";
      if (/\.45\s*acp|\.45\s*auto/i.test(raw)) return ".45 ACP";
      if (/\.45\s*(long\s*)?colt/i.test(raw)) return ".45 Colt";
      if (/\.45\s*super/i.test(raw)) return ".45 Super";
      if (/\.45\s*mag/i.test(raw)) return ".45 Magnum";
      if (/\.44-40/i.test(raw)) return ".44-40";
      if (/\.44/i.test(raw)) return ".44 Magnum";
      if (/\.41/i.test(raw)) return ".41 Magnum";
      if (/\.357/i.test(raw)) return ".357 Magnum";
      if (/\.380/i.test(raw)) return ".380 ACP";
      if (/\.454/i.test(raw)) return ".454 Casull";
      if (/\.460/i.test(raw)) return ".460 S&W";
      if (/\.500/i.test(raw)) return ".500 S&W";
      return raw;
    }
  }
  if (/unknown (?:handgun|pistol|caliber)|pistol unknown|handgun unknown|unknown pistol/i.test(text)) {
    return "Unknown handgun";
  }
  if (/handgun|pistol|revolver|sidearm/i.test(text)) return "Unknown handgun";
  return null;
}

function detectSubspecies(text: string): string | null {
  if (/polar/i.test(text)) return "polar";
  if (/grizzly|brown bear|kodiak/i.test(text)) return "grizzly";
  if (/black bear/i.test(text)) return "black";
  return null;
}

function detectLocation(text: string): {
  city?: string;
  region?: string;
  stateProvince?: string;
  country: Country;
} {
  const lower = text.toLowerCase();
  if (/svalbard|spitsbergen|barents|krosspynten|longyearbyen|hornsund|edgeøya|paulabren|storøya|austfjord/i.test(text)) {
    return { region: "Svalbard", stateProvince: "SV", country: "NO" };
  }
  if (/norway/.test(lower) && !/new/.test(lower)) {
    return { region: "Norway", stateProvince: "SV", country: "NO" };
  }
  if (/kassel|germany/.test(lower)) {
    return { city: "Kassel", stateProvince: "HE", country: "DE" };
  }
  if (/russia/.test(lower)) {
    return { country: "RU", stateProvince: "RU" };
  }

  let state: { abbr: string; country: Country } | undefined;
  let stateName = "";
  for (const [name, info] of Object.entries(STATE_MAP)) {
    const re = new RegExp(`\\b${name}\\b`, "i");
    if (re.test(text)) {
      state = info;
      stateName = name;
      break;
    }
  }

  const placeMatch = text.match(
    /(?:near |in |at |of |, )([A-Z][A-Za-z.'\-]+(?: [A-Z][A-Za-z.'\-]+){0,3})(?:,| \|)/,
  );
  let city: string | undefined;
  if (placeMatch) {
    const cand = placeMatch[1].replace(/\b(Alaska|Montana|Wyoming|Idaho|Colorado|Florida|California|Washington|Oregon|New York|Wisconsin|Tennessee|Arizona|New Mexico)\b/g, "").trim();
    if (cand.length > 2 && cand.length < 40) city = cand;
  }

  const knownPlaces = [
    "Becharof", "Greenwood Lake", "Great Falls", "Columbia Falls", "Marion County",
    "Resurrection Trail", "Island Park", "Siren", "Tepee Creek", "Meeteetse",
    "Hidden Lakes", "Choteau", "Ft. Walton Beach", "Fort Walton Beach", "Big Sky",
    "Denali", "Russian River", "Eagle River", "Seward", "Sitka", "Nome", "Sterling",
    "Glennallen", "Healy", "Kodiak", "Juneau", "Anchorage", "Homer", "Fairbanks",
    "Yellowstone", "Glacier", "Cody", "Pinedale", "Jackson", "Ennis", "Bozeman",
    "Kalispell", "West Yellowstone", "Churchill", "Dawson City", "Selkirk",
    "Steamboat Springs", "Winter Park", "South Lake Tahoe", "Silver City",
    "Gatlinburg", "Sevierville", "Bristol", "Rangeley", "Zanesville",
    "New Castle", "Sanford", "Kingston", "Luther", "Chena", "Wrangell",
    "Boundary Waters", "Kachemak", "Chichagof", "Chitina", "Byers Lake",
    "Keweenaw", "Talkeetna", "Lander", "Bondurant", "Baranof", "Wolf Creek",
  ];
  if (!city) {
    for (const p of knownPlaces) {
      if (new RegExp(`\\b${p}\\b`, "i").test(text)) {
        city = p;
        break;
      }
    }
  }

  if (!state) {
    if (/\bAK\b|Alaska/.test(text)) state = { abbr: "AK", country: "US" };
    else if (/\bMT\b|Montana/.test(text)) state = { abbr: "MT", country: "US" };
    else if (/\bWY\b|Wyoming/.test(text)) state = { abbr: "WY", country: "US" };
    else if (/\bID\b|Idaho/.test(text)) state = { abbr: "ID", country: "US" };
  }

  return {
    city,
    region: city ? undefined : stateName || undefined,
    stateProvince: state?.abbr,
    country: state?.country ?? "US",
  };
}

function parseDate(text: string): {
  occurredAt: string | null;
  datePrecision: SeedIncident["datePrecision"];
  dateDisplay: string;
} {
  const full = text.match(
    /\b(?:(\d{1,2})\s+)?(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[.,]?\s+(\d{1,2})?(?:(?:st|nd|rd|th))?,?\s+(\d{4})\b/i,
  );
  if (full) {
    const month = MONTHS[full[2].toLowerCase()];
    const day = Number(full[1] || full[3] || 0);
    const year = Number(full[4]);
    if (month && year) {
      const d = day || 1;
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return {
        occurredAt: iso,
        datePrecision: day ? "exact" : "month",
        dateDisplay: day ? `${full[2]} ${d}, ${year}` : `${full[2]} ${year}`,
      };
    }
  }
  const alt = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (alt) {
    const month = MONTHS[alt[1].toLowerCase()];
    const day = Number(alt[2]);
    const year = Number(alt[3]);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { occurredAt: iso, datePrecision: "exact", dateDisplay: `${alt[1]} ${day}, ${year}` };
  }
  const yearOnly = text.match(/\b(18|19|20)\d{2}\b/);
  if (yearOnly) {
    const y = Number(yearOnly[0]);
    return {
      occurredAt: `${y}-06-15`,
      datePrecision: /spring|summer|fall|autumn|winter|early|late|about/i.test(text) ? "year" : "year",
      dateDisplay: yearOnly[0],
    };
  }
  return { occurredAt: null, datePrecision: "unknown", dateDisplay: "Date unknown" };
}

function detectShots(text: string): number | null {
  const dump = text.match(
    /fired\s+(?:about\s+|approximately\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:shots?|rounds?|times)/i,
  );
  const words: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  };
  if (dump) {
    const n = words[dump[1].toLowerCase()] ?? Number(dump[1]);
    return Number.isFinite(n) ? n : null;
  }
  const emptied = text.match(/emptied.*?(\d+)[-\s]?round/i);
  if (emptied) return Number(emptied[1]);
  return null;
}

function detectSeverity(text: string): Severity {
  if (/\bkilled\b.*\b(man|woman|hunter|victim|photographer|girl|boy|child)\b|\b(man|woman|hunter|victim).{0,40}killed\b|fatal|died|dead with the bear|killed darcy|one man was killed/i.test(text)) {
    if (/bear (was )?(shot and )?killed|killed the bear|dead bear/i.test(text) && !/human|man was killed|woman was killed|killed darcy|photographer|victim/i.test(text)) {
      // fall through
    } else if (/killed darcy|one man was killed|fatal|died from|dead from what appeared|pfeiffer dead/i.test(text)) {
      return "fatal";
    }
  }
  if (/hospital|mauled|bitten|injured|injuries|wound|gored|trampled|non-life-threatening|serious injuries/i.test(text)) {
    return "injury";
  }
  if (/broke into|break-in|property|home|cabin|window|garage|cooler|meat pole/i.test(text) && !/charg/i.test(text)) {
    return "property";
  }
  return "near_miss";
}

function detectOutcome(text: string, combination: boolean): SeedIncident["defenseOutcome"] {
  if (combination) return "success";
  if (/\bfailure\b|handgun failure|did not stop|proved ineffective/i.test(text)) return "failure";
  if (/indeterminate|undetermined|could not be determined/i.test(text)) return "indeterminate";
  return "success";
}

function cleanSummary(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^>\s*/g, "")
    .trim()
    .slice(0, 900);
}

function makeTitle(loc: ReturnType<typeof detectLocation>, sub: string | null, dateDisplay: string, caliber: string | null) {
  const place = [loc.city, loc.stateProvince].filter(Boolean).join(", ") || loc.country;
  const animal = sub === "polar" ? "Polar bear" : sub === "black" ? "Black bear" : sub === "grizzly" ? "Grizzly / brown bear" : "Bear";
  const gun = caliber ? ` — ${caliber}` : "";
  return `${animal} defense, ${place} (${dateDisplay})${gun}`;
}

function toIncident(
  raw: string,
  header: string,
  sourceFile: string,
  combination: boolean,
): SeedIncident | null {
  const blob = `${header}\n${raw}`;
  if (blob.length < 40) return null;
  if (/duplicate|correction jan 9/i.test(blob) && /russel gillespie/i.test(blob) && /unknown/i.test(header)) {
    return null;
  }

  const loc = detectLocation(blob);
  const date = parseDate(header + " " + raw.slice(0, 200));
  const caliber = detectCaliber(header) ?? detectCaliber(raw);
  const sub = detectSubspecies(header) ?? detectSubspecies(raw);
  const shots = detectShots(blob);
  const outcome = detectOutcome(header + " " + raw.slice(0, 400), combination);
  const severity = detectSeverity(blob);
  const meta = SOURCE_META[sourceFile];
  const title = makeTitle(loc, sub, date.dateDisplay ?? "undated", caliber);
  const geo = offsetCoord(
    geocodeIncident({ ...loc }),
    title + (date.occurredAt ?? ""),
  );

  return {
    title,
    species: "bear",
    subspecies: sub,
    occurredAt: date.occurredAt,
    datePrecision: date.datePrecision,
    dateDisplay: date.dateDisplay,
    city: loc.city ?? null,
    region: loc.region ?? null,
    stateProvince: loc.stateProvince ?? null,
    country: loc.country,
    lat: geo.lat,
    lng: geo.lng,
    severity,
    summary: cleanSummary(raw || header),
    sourceType: "ammoland",
    verified: true,
    firearmType: "handgun",
    caliber,
    shotsFired: shots,
    defenseOutcome: outcome,
    combinationDefense: combination || /combination|rifle|& 10mm|shotgun|crossbow|bow and/i.test(header + raw.slice(0, 180)),
    attribution:
      "Dean Weingarten, documented handgun defenses against bears. Compiled from public Ammoland and Gun Watch lists. Not official wildlife-agency data.",
    sources: [
      {
        url: meta.url,
        title: meta.title,
        publisher: sourceFile.startsWith("gunwatch") ? "Gun Watch / Dean Weingarten" : "Ammoland / Dean Weingarten",
      },
    ],
  };
}

function splitGunwatch(text: string): { header: string; body: string; combination: boolean }[] {
  const start = text.indexOf("Here are the cases, sorted by caliber and date:");
  const body = start >= 0 ? text.slice(start) : text;
  const cases: { header: string; body: string; combination: boolean }[] = [];
  let combination = false;
  const lines = body.split(/\n/);
  let current: { header: string; body: string } | null = null;

  const flush = () => {
    if (current && current.header.length > 8) {
      cases.push({ ...current, combination });
    }
    current = null;
  };

  for (const line of lines) {
    if (/^We (found|have found)/i.test(line) && /combination|other weapons|not included in the 104/i.test(line + body.slice(body.indexOf(line), body.indexOf(line) + 200))) {
      // keep
    }
    if (/^To be complete, we include combination|^1\.\s+26 April, 1993/i.test(line)) {
      flush();
      combination = true;
    }
    if (/^1\.\s+Early 1960s, North Fork/i.test(line)) {
      flush();
      combination = false;
    }
    const m = line.match(/^(\d+)\.\s+(.+)/);
    if (m && m[2].length > 12) {
      flush();
      current = { header: m[2], body: "" };
      continue;
    }
    if (current) current.body += line + "\n";
  }
  flush();
  return cases;
}

function splitDatedBlocks(text: string): { header: string; body: string; combination: boolean }[] {
  const cases: { header: string; body: string; combination: boolean }[] = [];
  const parts = text.split(
    /(?=^(?:#{1,4}\s+)?(?:\d+\.\s+)?(?:Combination\s+)?(?:Early\s+|About\s+|Last week(?: in)?\s+|Spring(?: of)?\s+|Summer\s+|Fall\s+|Winter\s+|October\s+\d|January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\s+(?:January|August|September)|(?:\d{4}\s+)?(?:August|September|October|January|February|March|April|May|June|July|November|December)))/im,
  );
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length < 80) continue;
    if (/about dean weingarten|posted on|i have been researching|success rate is 98/i.test(trimmed) && trimmed.length < 400) continue;
    const first = trimmed.split("\n")[0].replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "");
    if (first.length < 12) continue;
    if (/^handguns proven|^update of pistol|^bear defense with|^we discovered|^as the number|^cases where a handgun|^here is the link|^of these 20|^caliber seems|^if a reader|^about dean/i.test(first)) {
      continue;
    }
    const combination = /combination/i.test(first);
    cases.push({
      header: first.slice(0, 240),
      body: trimmed.slice(first.length).trim(),
      combination,
    });
  }
  return cases;
}

function fingerprint(inc: SeedIncident): string {
  const d = inc.occurredAt?.slice(0, 7) ?? inc.dateDisplay ?? "";
  const place = `${inc.stateProvince ?? ""}|${(inc.city ?? "").toLowerCase()}`;
  const cal = (inc.caliber ?? "").toLowerCase();
  const words = inc.summary.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).slice(0, 12).join(" ");
  return `${d}|${place}|${cal}|${words}`;
}

function main() {
  const files = fs.readdirSync(SOURCES).filter((f) => f.endsWith(".txt"));
  const all: SeedIncident[] = [];

  for (const file of files) {
    const text = fs.readFileSync(path.join(SOURCES, file), "utf8");
    const chunks = file.startsWith("gunwatch") ? splitGunwatch(text) : splitDatedBlocks(text);
    for (const chunk of chunks) {
      const inc = toIncident(chunk.body, chunk.header, file, chunk.combination);
      if (inc) all.push(inc);
    }
  }

  const seen = new Set<string>();
  const unique: SeedIncident[] = [];
  for (const inc of all) {
    const fp = fingerprint(inc);
    if (seen.has(fp)) continue;
    seen.add(fp);
    unique.push(inc);
  }

  unique.sort((a, b) => (a.occurredAt ?? "9999").localeCompare(b.occurredAt ?? "9999"));
  fs.writeFileSync(OUT, JSON.stringify(unique, null, 2));
  console.log(`Wrote ${unique.length} Weingarten incidents to ${OUT}`);
  const byOutcome = unique.reduce<Record<string, number>>((acc, i) => {
    acc[i.defenseOutcome ?? "n/a"] = (acc[i.defenseOutcome ?? "n/a"] ?? 0) + 1;
    return acc;
  }, {});
  console.log("outcomes", byOutcome);
}

main();
