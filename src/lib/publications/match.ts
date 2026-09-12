import type { MatchResult } from "./types";
import type { Species } from "../types";

const ANIMAL_PATTERNS: { species: Species; re: RegExp; term: string }[] = [
  { species: "bear", term: "bear", re: /\b(grizzly|brown bear|black bear|polar bear|bears?)\b/i },
  { species: "moose", term: "moose", re: /\bmoose\b/i },
  { species: "elk", term: "elk", re: /\belk\b/i },
  {
    species: "mountain_lion",
    term: "mountain lion",
    re: /\b(mountain lions?|cougars?|pumas?)\b/i,
  },
];

const ATTACK_RE =
  /\b(attacks?|attacked|attacking|mauling|mauled|mauls|charging|gores|gored|tramples?|trampled|bites?|bitten|clawed)\b/i;

/** "bear charged a hiker" is an attack; "man charged with poaching elk" is not. */
const ANIMAL_CHARGED_RE =
  /\b(bears?|grizzly|moose|elk|mountain lions?|cougars?|pumas?)\b[^.]{0,40}\bcharged\b|\bcharged\b[^.]{0,40}\b(bears?|grizzly|moose|elk|mountain lions?|cougars?|pumas?)\b/i;

const NEGATIVE_RE =
  /\b(bear market|bearish|teddy bear|build[- ]a[- ]bear|chicago bears|baylor bears|ucla bruins|boston bruins|bear stearns|paddington|care bear|smokey bear merchandise|puma (shoes?|sneakers?|brand|store)|cougar (bar|club)|charging station|charging (a |an )?(fee|phone)|moose knuckle|elk grove (village|high|school)|mountain lion (energy|drink)|charged with|poach(?:ing|ed)?|climate attacks?|are climate|coca[- ]cola|santa claus|halloween costume|stuffed animal|bisons? (mauled|trample)|mauled by cougars|trample(?:d|s)? (over )?cougars|killed by dogs|wasn['’]t a bear|not a bear that)\b/i;

const FICTION_AD_RE =
  /\b(coca[- ]cola|santa (claus|getting)|cartoon|advertisement|ad campaign|halloween costume|stuffed animal)\b/i;

const PLACE_ONLY_RE =
  /\b(bear (creek|lake|river|mountain|valley|canyon|gap|butte)|elk (grove|city|rapids|horn|river|ton|point)|moose (jaw|lake|pass)|cougar (mountain|town))\b/i;

export function matchAnimalAttack(title: string, snippet = ""): MatchResult {
  const cleanSnippet = snippetIsSearchQueryEcho(snippet) ? "" : snippet;
  const text = `${title}\n${cleanSnippet}`.replace(/\s+/g, " ").trim();
  if (!text) return { matched: false, species: "other", reason: "empty" };
  if (snippetIsSearchQueryEcho(snippet) && !matchAnimalAttack(title, "").matched) {
    return { matched: false, species: "other", reason: "search-query-echo" };
  }
  if (
    /\b(bisons? (mauled|trample)|mauled by cougars|trample(?:d|s)? (over )?cougars|clawed by the cougars|golden bears|bears (hockey|football|volleyball)|dinos take|pandas legacy|varsity sports|racism in sport)\b/i.test(
      text,
    )
  ) {
    return { matched: false, species: "other", reason: "university-sports" };
  }
  if (/\b(killed by dogs|wasn['’]t a bear|not a bear that|not bear:)\b/i.test(text)) {
    return { matched: false, species: "other", reason: "not-animal-attack" };
  }

  if (NEGATIVE_RE.test(text) && !ATTACK_RE.test(text)) {
    return { matched: false, species: "other", reason: "negative-context" };
  }

  const attack = text.match(ATTACK_RE) ?? (ANIMAL_CHARGED_RE.test(text) ? ["charged", "charged"] : null);
  if (!attack) return { matched: false, species: "other", reason: "no-attack-term" };
  if (
    /\bcharged (with|in)\b/i.test(text) &&
    !ATTACK_RE.test(text) &&
    !/\b(mauled|mauling|attacked|charging)\b/i.test(text)
  ) {
    return { matched: false, species: "other", reason: "legal-charged-with" };
  }

  const attackIdx = text.search(ATTACK_RE);
  let animalHit: (typeof ANIMAL_PATTERNS)[number] | undefined;
  let bestDist = Infinity;
  for (const pat of ANIMAL_PATTERNS) {
    const m = text.match(pat.re);
    if (!m || m.index == null) continue;
    const dist = attackIdx >= 0 ? Math.abs(m.index - attackIdx) : m.index;
    if (!animalHit || dist < bestDist) {
      animalHit = pat;
      bestDist = dist;
    }
  }
  if (!animalHit) return { matched: false, species: "other", reason: "no-animal-term" };

  // Elk Grove / Bear Lake style place names without a nearby attack verb.
  if (PLACE_ONLY_RE.test(text)) {
    const place = text.match(PLACE_ONLY_RE)?.[0] ?? "";
    const stripped = text.replace(PLACE_ONLY_RE, " ");
    if (!animalHit.re.test(stripped) && !new RegExp(`${place}.{0,40}${ATTACK_RE.source}`, "i").test(text)) {
      return { matched: false, species: animalHit.species, reason: "place-name-only" };
    }
  }

  if (/\barchives?\b/i.test(title) && /^(bear|moose|elk|cougar|mountain lion) attack/i.test(title.trim())) {
    return { matched: false, species: "other", reason: "archive-index" };
  }

  if (
    /\bbear[- ](spray|mace)(ed|ing)?\b/i.test(text) &&
    !/\b(bears?|grizzly)\s+(attack|maul|charg)/i.test(text) &&
    !/\b(attacked|mauled|charged)\s+by\s+(a\s+)?(bears?|grizzly)/i.test(text)
  ) {
    return { matched: false, species: animalHit.species, reason: "bear-spray-assault" };
  }

  if (FICTION_AD_RE.test(text) && !/\b(hiker|hunter|camper|wildlife (officials?|officers?)|hospital)\b/i.test(text)) {
    return { matched: false, species: animalHit.species, reason: "ad-or-fiction" };
  }

  if (NEGATIVE_RE.test(text)) {
    const sports = /\b(chicago bears|baylor bears|bear market|puma (shoes?|sneakers?))\b/i.test(text);
    const metaphor = /\b(climate attacks?|are climate)\b/i.test(text);
    if ((sports || metaphor) && !/\b(grizzly|black bear|polar bear|mauled|mauling)\b/i.test(text)) {
      return { matched: false, species: animalHit.species, reason: "negative-context" };
    }
  }

  return {
    matched: true,
    species: animalHit.species,
    animalTerm: animalHit.term,
    attackTerm: attack[1],
  };
}

const SEARCH_QUERY_ONLY_RE =
  /^(bear attack|bear mauling|moose attack|elk attack|mountain lion attack|cougar attack|cougar mauling)$/i;

/** Site-search pages often echo the query as the only "snippet" — that is not a match. */
export function snippetIsSearchQueryEcho(snippet: string): boolean {
  return SEARCH_QUERY_ONLY_RE.test(snippet.replace(/\s+/g, " ").trim());
}

export const SEARCH_QUERIES = [
  "bear attack",
  "bear mauling",
  "moose attack",
  "elk attack",
  "mountain lion attack",
  "cougar attack",
  "cougar mauling",
];

export function urlLooksLikeMatch(url: string): boolean {
  return matchAnimalAttack(decodeURIComponent(url.replace(/[-_/]+/g, " "))).matched;
}
