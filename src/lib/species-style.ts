import { SPECIES, SPECIES_LABELS, type Species } from "./types";

export type { Species };

/** Distinct, high-contrast colors on the dark field map (WCAG-ish vs #0b100d). */
export const SPECIES_COLOR: Record<Species, string> = {
  bear: "#FF8A4C",
  mountain_lion: "#F5D76E",
  elk: "#3DDC97",
  moose: "#6CB4EE",
  other: "#C4B5FD",
};

export const SPECIES_INK: Record<Species, string> = {
  bear: "#2a1006",
  mountain_lion: "#2a2206",
  elk: "#06241a",
  moose: "#061525",
  other: "#1a1230",
};

export const MIXED_CLUSTER = "#E8D5B0";

export function speciesColor(species: string) {
  return SPECIES_COLOR[(species as Species) ?? "other"] ?? SPECIES_COLOR.other;
}

export function speciesLabel(species: string) {
  return SPECIES_LABELS[species as Species] ?? species;
}

export { SPECIES, SPECIES_LABELS };
