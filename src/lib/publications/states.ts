export const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  PR: "Puerto Rico",
  GU: "Guam",
  VI: "U.S. Virgin Islands",
  AS: "American Samoa",
  MP: "Northern Mariana Islands",
};

const NAME_TO_ABBR = new Map(
  Object.entries(US_STATE_NAMES).flatMap(([abbr, name]) => [
    [name.toLowerCase(), abbr],
    [abbr.toLowerCase(), abbr],
  ]),
);

NAME_TO_ABBR.set("washington, d.c.", "DC");
NAME_TO_ABBR.set("washington dc", "DC");
NAME_TO_ABBR.set("district of columbia", "DC");
NAME_TO_ABBR.set("d.c.", "DC");

export function stateAbbr(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw || raw === "NA" || raw === "non-US") return null;
  return NAME_TO_ABBR.get(raw.toLowerCase()) ?? (US_STATE_NAMES[raw.toUpperCase()] ? raw.toUpperCase() : null);
}

/** States / regions where bear, cougar, elk, or moose encounters are most often reported. */
export const WILDLIFE_STATES = [
  "AK",
  "MT",
  "WY",
  "ID",
  "CO",
  "WA",
  "OR",
  "CA",
  "AZ",
  "NM",
  "UT",
  "NV",
  "ME",
  "MN",
  "WI",
  "MI",
  "NH",
  "VT",
  "NY",
  "PA",
  "TN",
  "NC",
  "VA",
  "WV",
  "SD",
  "ND",
  "FL",
  // Remaining black-bear / cougar range after the first wave
  "TX",
  "OK",
  "AR",
  "GA",
  "KY",
  "MO",
  "IA",
  "KS",
  "NE",
  "LA",
  "AL",
  "SC",
  "MS",
  "OH",
  "IN",
  "IL",
] as const;

/** Canadian provinces / territories where bear, moose, elk, or cougar reports concentrate. */
export const CA_PROVINCE_NAMES: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

const CA_NAME_TO_ABBR = new Map(
  Object.entries(CA_PROVINCE_NAMES).flatMap(([abbr, name]) => [
    [name.toLowerCase(), abbr],
    [abbr.toLowerCase(), abbr],
  ]),
);
CA_NAME_TO_ABBR.set("b.c.", "BC");
CA_NAME_TO_ABBR.set("alta.", "AB");
CA_NAME_TO_ABBR.set("sask.", "SK");
CA_NAME_TO_ABBR.set("nwt", "NT");
CA_NAME_TO_ABBR.set("n.w.t.", "NT");
CA_NAME_TO_ABBR.set("yukon territory", "YT");

export function provinceAbbr(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  return CA_NAME_TO_ABBR.get(raw.toLowerCase()) ?? (CA_PROVINCE_NAMES[raw.toUpperCase()] ? raw.toUpperCase() : null);
}

export function regionAbbr(input?: string | null): string | null {
  return stateAbbr(input) ?? provinceAbbr(input);
}

export function regionName(abbr?: string | null): string {
  if (!abbr) return "";
  return US_STATE_NAMES[abbr] ?? CA_PROVINCE_NAMES[abbr] ?? "";
}

export const WILDLIFE_PROVINCES = ["YT", "NT", "NU", "BC", "AB", "SK", "MB", "ON"] as const;

/** Wildlife-dense US states for archive backfill (RSS-first pass already done). */
export const BACKFILL_STATES = [
  "AK",
  "MT",
  "WY",
  "ID",
  "CO",
  "WA",
  "OR",
  "CA",
  "NM",
  "UT",
  "NV",
  "ME",
  "MN",
  "WI",
  "MI",
  "NH",
  "VT",
] as const;

export function wildlifeRank(state?: string | null): number {
  if (!state) return 80;
  const backfill = (BACKFILL_STATES as readonly string[]).indexOf(state);
  if (backfill !== -1) return backfill;
  const prov = (WILDLIFE_PROVINCES as readonly string[]).indexOf(state);
  if (prov !== -1) return 20 + prov;
  const i = WILDLIFE_STATES.indexOf(state as (typeof WILDLIFE_STATES)[number]);
  return i === -1 ? 50 : 40 + i;
}

/** Under-scanned leftovers after the first nationwide sweep (~7.2k pubs). */
export const LEFTOVER_STATES = [
  "IL",
  "MA",
  "OH",
  "IN",
  "MS",
  "LA",
  "AL",
  "SC",
  "CT",
  "MD",
  "NJ",
  "DE",
  "RI",
  "HI",
  "DC",
] as const;
