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
  return stateAbbr(input) ?? provinceAbbr(input) ?? mxStateAbbr(input);
}

export function regionName(abbr?: string | null): string {
  if (!abbr) return "";
  return US_STATE_NAMES[abbr] ?? CA_PROVINCE_NAMES[abbr] ?? MX_STATE_NAMES[abbr] ?? "";
}

export const WILDLIFE_PROVINCES = ["YT", "NT", "NU", "BC", "AB", "SK", "MB", "ON"] as const;

/**
 * Mexican states — ISO 3166-2:MX three-letter codes so Baja California (BCN)
 * never collides with British Columbia (BC), and Nuevo León (NLE) never
 * collides with Newfoundland (NL).
 */
export const MX_STATE_NAMES: Record<string, string> = {
  AGU: "Aguascalientes",
  BCN: "Baja California",
  BCS: "Baja California Sur",
  CAM: "Campeche",
  CHP: "Chiapas",
  CHH: "Chihuahua",
  COA: "Coahuila",
  COL: "Colima",
  CMX: "Ciudad de México",
  DUR: "Durango",
  GUA: "Guanajuato",
  GRO: "Guerrero",
  HID: "Hidalgo",
  JAL: "Jalisco",
  MEX: "Estado de México",
  MIC: "Michoacán",
  MOR: "Morelos",
  NAY: "Nayarit",
  NLE: "Nuevo León",
  OAX: "Oaxaca",
  PUE: "Puebla",
  QUE: "Querétaro",
  ROO: "Quintana Roo",
  SLP: "San Luis Potosí",
  SIN: "Sinaloa",
  SON: "Sonora",
  TAB: "Tabasco",
  TAM: "Tamaulipas",
  TLA: "Tlaxcala",
  VER: "Veracruz",
  YUC: "Yucatán",
  ZAC: "Zacatecas",
};

const MX_NAME_TO_ABBR = new Map(
  Object.entries(MX_STATE_NAMES).flatMap(([abbr, name]) => [
    [name.toLowerCase(), abbr],
    [abbr.toLowerCase(), abbr],
  ]),
);
MX_NAME_TO_ABBR.set("baja california norte", "BCN");
MX_NAME_TO_ABBR.set("baja calif.", "BCN");
MX_NAME_TO_ABBR.set("baja california sur", "BCS");
MX_NAME_TO_ABBR.set("nuevo leon", "NLE");
MX_NAME_TO_ABBR.set("nuevo león", "NLE");
MX_NAME_TO_ABBR.set("cdmx", "CMX");
MX_NAME_TO_ABBR.set("ciudad de mexico", "CMX");
MX_NAME_TO_ABBR.set("mexico city", "CMX");
MX_NAME_TO_ABBR.set("df", "CMX");
MX_NAME_TO_ABBR.set("d.f.", "CMX");
MX_NAME_TO_ABBR.set("edo. de mexico", "MEX");
MX_NAME_TO_ABBR.set("estado de mexico", "MEX");
MX_NAME_TO_ABBR.set("michoacan", "MIC");
MX_NAME_TO_ABBR.set("queretaro", "QUE");
MX_NAME_TO_ABBR.set("yucatan", "YUC");
MX_NAME_TO_ABBR.set("san luis potosi", "SLP");

export function mxStateAbbr(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  return MX_NAME_TO_ABBR.get(raw.toLowerCase()) ?? (MX_STATE_NAMES[raw.toUpperCase()] ? raw.toUpperCase() : null);
}

/** Northern + jaguar / black-bear range first (moose N/A; elk rare in northern CHH). */
export const WILDLIFE_MX_STATES = [
  "SON",
  "CHH",
  "COA",
  "NLE",
  "BCN",
  "BCS",
  "SIN",
  "DUR",
  "TAM",
  "JAL",
  "NAY",
  "MIC",
  "GRO",
  "OAX",
  "CHP",
  "TAB",
  "VER",
  "CAM",
  "ROO",
  "YUC",
  "ZAC",
  "SLP",
] as const;

/** Deep western US archive backfill — RSS first-pass already done in earlier PRs. */
export const WESTERN_CORE_STATES = ["AK", "MT", "WY", "ID", "CO"] as const;

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
  const west = (WESTERN_CORE_STATES as readonly string[]).indexOf(state);
  if (west !== -1) return west;
  const backfill = (BACKFILL_STATES as readonly string[]).indexOf(state);
  if (backfill !== -1) return 5 + backfill;
  const prov = (WILDLIFE_PROVINCES as readonly string[]).indexOf(state);
  if (prov !== -1) return 20 + prov;
  const mx = (WILDLIFE_MX_STATES as readonly string[]).indexOf(state);
  if (mx !== -1) return 30 + mx;
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
