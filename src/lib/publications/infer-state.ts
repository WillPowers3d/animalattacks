import { US_STATE_NAMES, stateAbbr } from "./states";

/** Geographic center of the contiguous US — used as a last-resort coordinate, not a state. */
export const US_CENTROID = { lat: 39.8283, lng: -98.5795 };

export function isUsCentroid(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  return Math.abs(lat - US_CENTROID.lat) < 0.02 && Math.abs(lng - US_CENTROID.lng) < 0.02;
}

const BUNDLE_SKIP = new Set([
  "tech",
  "entertainment",
  "sports",
  "aviation",
  "feminist",
  "capitol-hill",
  "us-national",
  "us-right-wing",
  "us-left-wing",
]);

const DOMAIN_STOP = new Set([
  "national",
  "university",
  "independent",
  "independence",
  "american",
  "republic",
  "tribune",
  "journal",
  "gazette",
  "herald",
  "sentinel",
  "chronicle",
  "pioneer",
  "enterprise",
  "review",
  "press",
  "times",
  "daily",
  "weekly",
  "county",
  "valley",
  "mountain",
  "forest",
  "prairie",
  "summit",
  "central",
  "united",
  "liberty",
  "freedom",
  "community",
  "digital",
  "online",
  "news",
  "media",
  "radio",
  "television",
  "sports",
  "business",
  "magazine",
  "report",
  "today",
  "morning",
  "evening",
  "sunday",
  "observer",
  "advocate",
  "courier",
  "dispatch",
  "standard",
  "record",
  "leader",
  "citizen",
  "democrat",
  "republican",
  "progress",
  "journal",
  "post",
  "sun",
  "star",
  "news",
  "washington",
  "springfield",
  "franklin",
  "clinton",
  "madison",
  "jackson",
  "lincoln",
  "portland",
  "rochester",
  "columbus",
  "richmond",
  "salem",
  "auburn",
  "lexington",
  "oxford",
  "hudson",
  "kingston",
  "manchester",
  "newark",
  "warren",
  "wayne",
  "york",
  "burlington",
  "orange",
  "union",
  "center",
  "mobile",
  "dallas",
  "austin",
  "houston",
  "jackson",
  "columbia",
  "georgia",
]);

const STATE_NAME_TO_ABBR: [string, string][] = Object.entries(US_STATE_NAMES)
  .filter(([abbr]) => abbr.length === 2)
  .map(([abbr, name]) => [name.toLowerCase(), abbr] as [string, string])
  .sort((a, b) => b[0].length - a[0].length);

const EXTRA_BUNDLE: Record<string, string> = {
  "new-york-state": "NY",
  "new-york-city": "NY",
  "north-carolina": "NC",
  "south-carolina": "SC",
  "north-dakota": "ND",
  "south-dakota": "SD",
  "new-hampshire": "NH",
  "new-jersey": "NJ",
  "new-mexico": "NM",
  "west-virginia": "WV",
  "rhode-island": "RI",
  "district-of-columbia": "DC",
  "washington-dc": "DC",
  socal: "CA",
  "bay-area": "CA",
  california: "CA",
  chicago: "IL",
  philadelphia: "PA",
  gannett: "",
};

export function stateFromBundle(bundle?: string | null): string | null {
  if (!bundle) return null;
  const parts = bundle
    .toLowerCase()
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  const found: string[] = [];
  for (const part of parts) {
    if (BUNDLE_SKIP.has(part)) continue;
    const extra = EXTRA_BUNDLE[part];
    if (extra === "") continue;
    if (extra) {
      found.push(extra);
      continue;
    }
    const fromName = STATE_NAME_TO_ABBR.find(([name]) => part === name || part.replace(/-/g, " ") === name);
    if (fromName) found.push(fromName[1]);
  }
  const uniq = [...new Set(found)];
  return uniq.length === 1 ? uniq[0] : null;
}

export function cleanPlace(raw?: string | null): string | null {
  if (!raw) return null;
  const t = raw
    .replace(/\s+(municipality|county|borough|parish|census area|city and borough)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || /^(na|n\/a|unknown|non-us)$/i.test(t)) return null;
  return t;
}

/** Parse "Morgantown, WV" or "Atlanta" from a location field. */
export function parseLocationField(raw?: string | null): { city: string | null; state: string | null } {
  const t = cleanPlace(raw);
  if (!t) return { city: null, state: null };
  const m = t.match(/^(.+?),\s*([A-Za-z.\s]{2,})$/);
  if (m) {
    return { city: cleanPlace(m[1]), state: stateAbbr(m[2]) };
  }
  return { city: t, state: null };
}

export type UniqueCityIndex = Map<string, string>;

export function buildUniqueCityIndex(
  rows: { city: string; state: string }[],
): UniqueCityIndex {
  const all = new Map<string, Set<string>>();
  for (const row of rows) {
    const city = cleanPlace(row.city)?.toLowerCase();
    const st = stateAbbr(row.state);
    if (!city || !st) continue;
    const set = all.get(city) ?? new Set();
    set.add(st);
    all.set(city, set);
  }
  const unique: UniqueCityIndex = new Map();
  for (const [city, states] of all) {
    if (states.size === 1) unique.set(city, [...states][0]);
  }
  return unique;
}

export function stateFromCityName(city: string | null | undefined, unique: UniqueCityIndex): string | null {
  const key = cleanPlace(city)?.toLowerCase();
  if (!key) return null;
  return unique.get(key) ?? null;
}

export function stateFromDomain(domain: string, unique: UniqueCityIndex): string | null {
  const host = domain.toLowerCase().replace(/^www\./, "");
  const compact = host.replace(/[^a-z]/g, "");

  const us = host.match(/\.([a-z]{2})\.us$/i);
  if (us) {
    const st = stateAbbr(us[1]);
    if (st && st !== "US") return st;
  }

  const hits = new Set<string>();
  for (const [name, abbr] of STATE_NAME_TO_ABBR) {
    if (name.length < 5) continue;
    const slug = name.replace(/\s+/g, "");
    if (compact.includes(slug)) hits.add(abbr);
  }
  if (hits.size === 1) return [...hits][0];

  const cityHits = new Set<string>();
  for (const [city, st] of unique) {
    if (city.length < 6) continue;
    if (DOMAIN_STOP.has(city)) continue;
    const slug = city.replace(/[^a-z]/g, "");
    if (slug.length >= 6 && compact.includes(slug)) cityHits.add(st);
  }
  if (cityHits.size === 1) return [...cityHits][0];
  return null;
}

export function firstDefined<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) {
    if (v != null && v !== "") return v as T;
  }
  return null;
}
