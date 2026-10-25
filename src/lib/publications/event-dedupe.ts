/**
 * Cross-URL event identity for reprint farms (Black Press, Glacier, CP wire).
 * Same attack: similar title + compatible date + shared place — even when the
 * host, headline wording, and publication town differ.
 */

export type EventFields = {
  title: string;
  occurredAt?: string | Date | null;
  city?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  species?: string | null;
  sourceType?: string | null;
  urls?: string[];
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "in",
  "on",
  "at",
  "of",
  "to",
  "for",
  "from",
  "after",
  "following",
  "near",
  "and",
  "or",
  "as",
  "by",
  "with",
  "over",
  "about",
  "into",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "that",
  "this",
  "its",
  "his",
  "her",
  "their",
  "says",
  "said",
  "say",
  "update",
  "updated",
  "video",
  "photos",
  "photo",
  "news",
  "alert",
  "cp",
  "newsalert",
  "breaking",
  "watch",
  "latest",
  "officials",
  "official",
  "police",
  "rcmp",
  "officers",
  "officer",
  "conservation",
]);

/** Distinctive wildlife-country places (CA + western US) used as reprint anchors. */
const PLACE_ALIASES: [RegExp, string][] = [
  [/\bbella\s+coola\b|\bnuxalk\b/i, "bella coola"],
  [/\bmaple\s+ridge\b/i, "maple ridge"],
  [/\banmore\b/i, "anmore"],
  [/\bsquamish\b/i, "squamish"],
  [/\bwhistler\b/i, "whistler"],
  [/\bvanderhoof\b/i, "vanderhoof"],
  [/\bpemberton\b/i, "pemberton"],
  [/\bshuswap\b/i, "shuswap"],
  [/\bhay\s+river\b/i, "hay river"],
  [/\btulita\b/i, "tulita"],
  [/\bmayo\b/i, "mayo"],
  [/\biqaluit\b/i, "iqaluit"],
  [/\bsanirajak\b|\bhally\s+beach\b/i, "sanirajak"],
  [/\bnaujaat\b|\brepulse\s+bay\b/i, "naujaat"],
  [/\bauyuittuq\b/i, "auyuittuq"],
  [/\bfort\s+frances\b/i, "fort frances"],
  [/\bkenora\b/i, "kenora"],
  [/\bwawa\b/i, "wawa"],
  [/\bbuffalo\s+narrows\b/i, "buffalo narrows"],
  [/\bshamattawa\b/i, "shamattawa"],
  [/\bprince\s+albert\b/i, "prince albert"],
  [/\bbanff\b/i, "banff"],
  [/\bjasper\b/i, "jasper"],
  [/\bwaterton\b/i, "waterton"],
  [/\brocky\s+mountain\s+house\b/i, "rocky mountain house"],
  [/\bsylvan\s+lake\b/i, "sylvan lake"],
  [/\bagassiz\b/i, "agassiz"],
  [/\blillooet\b/i, "lillooet"],
  [/\bladysmith\b/i, "ladysmith"],
  [/\bvancouver\s+island\b/i, "vancouver island"],
  [/\bsmithers\b/i, "smithers"],
  [/\bpine\s+lake\b/i, "pine lake"],
  [/\bfort\s+liard\b/i, "fort liard"],
  [/\bcanmore\b/i, "canmore"],
  [/\bwhitehorse\b/i, "whitehorse"],
  [/\byellowknife\b/i, "yellowknife"],
  [/\bchurchill\b/i, "churchill"],
  [/\bovando\b/i, "ovando"],
  [/\bbig\s+sky\b/i, "big sky"],
  [/\bcolumbia\s+falls\b/i, "columbia falls"],
  [/\bwest\s+yellowstone\b/i, "west yellowstone"],
  [/\bchoteau\b/i, "choteau"],
  [/\bcody\b/i, "cody"],
  [/\blander\b/i, "lander"],
  [/\bglacier\s+(national\s+)?park\b/i, "glacier"],
  [/\byellowstone\b/i, "yellowstone"],
  [/\bsummit\s+lake\b/i, "summit lake"],
  [/\bred\s+river\b/i, "red river"],
  [/\bcedar\s+crest\b/i, "cedar crest"],
  [/\barmstrong\b/i, "armstrong"],
  [/\bport\s+alberni\b/i, "port alberni"],
  [/\bnorth\s+shore\b/i, "north shore"],
  [/\bucluelet\b/i, "ucluelet"],
  [/\bkootenay\b/i, "kootenay"],
  [/\bbethel\b/i, "bethel"],
  [/\bmetchosin\b/i, "metchosin"],
];

const EVENT_TOKEN_GROUPS: string[][] = [
  ["student", "students", "pupil", "pupils", "elementary", "school", "class", "teacher", "teachers"],
  ["musician", "composer", "concert"],
  ["infant", "month", "baby", "toddler", "10month"],
  ["girl", "boy", "child", "children"],
  ["polar"],
  ["jogger", "runner", "hiker", "cyclist", "skier"],
  ["alpaca"],
];

export function normalizeEventTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/\s*[|—–].*$/, " ")
    .replace(/\s+[-–—]\s+(northern pride publications|the .*)\s*$/i, " ")
    .replace(/\s+[-–—]\s+[a-z0-9 .]{8,}$/i, " ")
    .replace(/\b(b\.?\s*c\.?|british columbia|colombie[- ]britannique)\b/g, "bc")
    .replace(/\b(n\.?\s*w\.?\s*t\.?|northwest territories)\b/g, "nt")
    .replace(/\b(alta\.?|alberta)\b/g, "ab")
    .replace(/\b(sask\.?|saskatchewan)\b/g, "sk")
    .replace(/\b(yukon)\b/g, "yt")
    .replace(/\b(nunavut)\b/g, "nu")
    .replace(/\b(ontario)\b/g, "on")
    .replace(/\b(manitoba)\b/g, "mb")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function significantTokens(title: string): string[] {
  return normalizeEventTitle(title)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

export function extractPlaces(text: string, city?: string | null): string[] {
  const found = new Set<string>();
  for (const [re, key] of PLACE_ALIASES) {
    if (re.test(text)) found.add(key);
  }
  if (city && city.trim().length > 2) {
    const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) {
      const n = normalizeEventTitle(city);
      if (n.length > 3 && !STOP.has(n)) found.add(n);
    }
  }
  return [...found];
}

export function reprintPathKey(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    if (path.length < 24) return null;
    if (/^\/(feed|rss|category|tag|author|page|search|section)\b/.test(path)) return null;
    return path;
  } catch {
    return null;
  }
}

function dateStamp(value?: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function daysApart(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return Math.abs(da - db) / 86_400_000;
}

function datesCompatible(a?: string | Date | null, b?: string | Date | null, windowDays = 14): boolean {
  const aa = dateStamp(a);
  const bb = dateStamp(b);
  if (!aa || !bb) return true;
  return daysApart(aa, bb) <= windowDays;
}

function sharedEventGroup(aTokens: string[], bTokens: string[]): boolean {
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  for (const group of EVENT_TOKEN_GROUPS) {
    const aHit = group.some((t) => A.has(t));
    const bHit = group.some((t) => B.has(t));
    if (aHit && bHit) return true;
  }
  return false;
}

function sharedPlaces(a: EventFields, b: EventFields): string[] {
  const pa = extractPlaces(a.title, a.city);
  const pb = extractPlaces(b.title, b.city);
  return pa.filter((p) => pb.includes(p));
}

const REGION_FROM_TITLE: [RegExp, string][] = [
  [/\bbc\b/, "BC"],
  [/\bab\b/, "AB"],
  [/\bsk\b/, "SK"],
  [/\bmb\b/, "MB"],
  [/\bon\b/, "ON"],
  [/\byt\b/, "YT"],
  [/\bnt\b/, "NT"],
  [/\bnu\b/, "NU"],
  [/\bqc\b|\bquebec\b/, "QC"],
];

export function inferRegion(title: string, state?: string | null): string | null {
  if (state) return state.toUpperCase();
  const n = normalizeEventTitle(title);
  for (const [re, abbr] of REGION_FROM_TITLE) {
    if (re.test(n)) return abbr;
  }
  return null;
}

function sameStateOrUnknown(
  a?: string | null,
  b?: string | null,
  aTitle?: string,
  bTitle?: string,
): boolean {
  const ra = inferRegion(aTitle ?? "", a);
  const rb = inferRegion(bTitle ?? "", b);
  if (!ra || !rb) return true;
  return ra === rb;
}

function sameCountryOrUnknown(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return true;
  return a.toUpperCase() === b.toUpperCase();
}

export function urlsShareReprintPath(aUrls: string[] = [], bUrls: string[] = []): boolean {
  const keys = new Set(
    aUrls.map(reprintPathKey).filter((k): k is string => Boolean(k)),
  );
  for (const url of bUrls) {
    const k = reprintPathKey(url);
    if (k && keys.has(k)) return true;
  }
  return false;
}

export function sameEvent(a: EventFields, b: EventFields): { match: boolean; reason: string; score: number } {
  if (a.species && b.species && a.species !== b.species) {
    return { match: false, reason: "species", score: 0 };
  }
  if (!sameCountryOrUnknown(a.country, b.country)) {
    return { match: false, reason: "country", score: 0 };
  }
  if (!datesCompatible(a.occurredAt, b.occurredAt)) {
    return { match: false, reason: "date-window", score: 0 };
  }

  if (urlsShareReprintPath(a.urls, b.urls)) {
    return { match: true, reason: "reprint-path", score: 1 };
  }

  const placesA = extractPlaces(a.title, a.city);
  const placesB = extractPlaces(b.title, b.city);
  if (placesA.length && placesB.length && !placesA.some((p) => placesB.includes(p))) {
    return { match: false, reason: "conflicting-place", score: 0 };
  }

  const ta = significantTokens(a.title);
  const tb = significantTokens(b.title);
  const score = jaccard(ta, tb);
  const places = sharedPlaces(a, b);
  const place = places[0] ?? null;
  const group = sharedEventGroup(ta, tb);
  const schoolGroup = sharedEventGroup(
    ta.filter((t) => EVENT_TOKEN_GROUPS[0].includes(t)),
    tb.filter((t) => EVENT_TOKEN_GROUPS[0].includes(t)),
  );
  const titleRegionMatch =
    Boolean(inferRegion(a.title)) && inferRegion(a.title) === inferRegion(b.title);
  const stateOk =
    sameStateOrUnknown(a.stateProvince, b.stateProvince, a.title, b.title) ||
    Boolean(place) ||
    titleRegionMatch;

  if (a.sourceType === "ammoland" || b.sourceType === "ammoland") {
    return { match: false, reason: "weingarten-guard", score };
  }

  if (score >= 0.55 && stateOk) {
    return { match: true, reason: "title-jaccard", score };
  }

  const broadPlace = Boolean(
    place && /vancouver island|yellowstone|glacier|banff|north shore/.test(place),
  );
  const placeTitleFloor = broadPlace ? 0.42 : 0.24;
  if (place && (score >= placeTitleFloor || group) && stateOk) {
    return { match: true, reason: place && group ? "place+event-tokens" : "place+title", score };
  }

  if (place && score >= 0.22 && group) {
    return { match: true, reason: "place+weak-title+tokens", score };
  }

  if (schoolGroup && (place || titleRegionMatch) && score >= 0.06) {
    return { match: true, reason: "school-group-wire", score };
  }

  const cityA = (a.city ?? "").toLowerCase();
  const cityB = (b.city ?? "").toLowerCase();
  const bothDated = Boolean(dateStamp(a.occurredAt) && dateStamp(b.occurredAt));
  if (cityA && cityA === cityB && score >= 0.4 && bothDated && datesCompatible(a.occurredAt, b.occurredAt, 3)) {
    return { match: true, reason: "same-city-title", score };
  }

  return { match: false, reason: "no-match", score };
}

export function clusterEvents<T extends EventFields>(rows: T[]): T[][] {
  const clusters: T[][] = [];
  const assigned = new Array(rows.length).fill(false);
  for (let i = 0; i < rows.length; i++) {
    if (assigned[i]) continue;
    const group = [rows[i]];
    assigned[i] = true;
    for (let j = i + 1; j < rows.length; j++) {
      if (assigned[j]) continue;
      if (group.some((g) => sameEvent(g, rows[j]).match)) {
        group.push(rows[j]);
        assigned[j] = true;
      }
    }
    clusters.push(group);
  }
  return clusters;
}

export function eventFingerprint(inc: EventFields): string {
  const places = extractPlaces(inc.title, inc.city);
  const date = dateStamp(inc.occurredAt) ?? "undated";
  const core = significantTokens(inc.title).slice(0, 8).join("-");
  return [inc.species ?? "?", inc.country ?? "?", places[0] ?? inc.stateProvince ?? "?", date, core].join("|");
}
