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

export function wildlifeRank(state?: string | null): number {
  if (!state) return 80;
  const i = WILDLIFE_STATES.indexOf(state as (typeof WILDLIFE_STATES)[number]);
  return i === -1 ? 50 : i;
}
