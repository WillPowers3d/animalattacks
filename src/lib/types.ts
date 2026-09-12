export const SPECIES = [
  "bear",
  "mountain_lion",
  "elk",
  "moose",
  "other",
] as const;
export type Species = (typeof SPECIES)[number];

export const SEVERITIES = [
  "fatal",
  "injury",
  "near_miss",
  "property",
] as const;
export type Severity = (typeof SEVERITIES)[number];

export const FIREARM_TYPES = [
  "handgun",
  "rifle",
  "shotgun",
  "spray",
  "none",
  "unknown",
] as const;
export type FirearmType = (typeof FIREARM_TYPES)[number];

export const DEFENSE_OUTCOMES = [
  "success",
  "failure",
  "indeterminate",
] as const;
export type DefenseOutcome = (typeof DEFENSE_OUTCOMES)[number];

export const SOURCE_TYPES = [
  "news",
  "facebook",
  "ammoland",
  "agency",
  "other",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  news: "News",
  facebook: "Facebook",
  ammoland: "Ammoland / Weingarten",
  agency: "Wildlife agency / park",
  other: "Other",
};

export const COUNTRIES = ["US", "CA", "MX", "NO", "DE", "RU", "OTHER"] as const;
export type Country = (typeof COUNTRIES)[number];

export const DATE_PRECISIONS = [
  "exact",
  "month",
  "year",
  "unknown",
] as const;
export type DatePrecision = (typeof DATE_PRECISIONS)[number];

export type SeedIncident = {
  title: string;
  species: Species;
  subspecies?: string | null;
  occurredAt?: string | null;
  datePrecision?: DatePrecision;
  dateDisplay?: string | null;
  city?: string | null;
  region?: string | null;
  stateProvince?: string | null;
  country: Country;
  lat?: number | null;
  lng?: number | null;
  severity: Severity;
  summary: string;
  sourceType: SourceType;
  verified?: boolean;
  firearmType?: FirearmType | null;
  caliber?: string | null;
  shotsFired?: number | null;
  defenseOutcome?: DefenseOutcome | null;
  combinationDefense?: boolean;
  attribution?: string | null;
  publicationId?: string | null;
  sources: { url: string; title?: string; publisher?: string }[];
};

export const SPECIES_LABELS: Record<Species, string> = {
  bear: "Bear",
  mountain_lion: "Mountain lion",
  elk: "Elk",
  moose: "Moose",
  other: "Other",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  fatal: "Fatal",
  injury: "Injury",
  near_miss: "Near-miss",
  property: "Property",
};

export const FIREARM_LABELS: Record<FirearmType, string> = {
  handgun: "Handgun",
  rifle: "Rifle",
  shotgun: "Shotgun",
  spray: "Bear spray",
  none: "None",
  unknown: "Unknown",
};

export const OUTCOME_LABELS: Record<DefenseOutcome, string> = {
  success: "Success",
  failure: "Failure",
  indeterminate: "Indeterminate",
};
