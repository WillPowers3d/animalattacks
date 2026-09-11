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
  /\b(bear market|bearish|teddy bear|build[- ]a[- ]bear|chicago bears|baylor bears|ucla bruins|boston bruins|bear stearns|paddington|care bear|smokey bear merchandise|puma (shoes?|sneakers?|brand|store)|cougar (bar|club)|charging station|charging (a |an )?(fee|phone)|moose knuckle|elk grove (village|high|school)|mountain lion (energy|drink)|charged with|poach(?:ing|ed)?)\b/i;

const PLACE_ONLY_RE =
  /\b(bear (creek|lake|river|mountain|valley|canyon|gap|butte)|elk (grove|city|rapids|horn|river|ton|point)|moose (jaw|lake|pass)|cougar (mountain|town))\b/i;

export function matchAnimalAttack(title: string, snippet = ""): MatchResult {
  const text = `${title}\n${snippet}`.replace(/\s+/g, " ").trim();
  if (!text) return { matched: false, species: "other", reason: "empty" };

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

  let animalHit: (typeof ANIMAL_PATTERNS)[number] | undefined;
  for (const pat of ANIMAL_PATTERNS) {
    if (pat.re.test(text)) {
      animalHit = pat;
      break;
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

  if (NEGATIVE_RE.test(text)) {
    const sports = /\b(chicago bears|baylor bears|bear market|puma (shoes?|sneakers?))\b/i.test(text);
    if (sports && !/\b(grizzly|black bear|polar bear|mauled|mauling)\b/i.test(text)) {
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
