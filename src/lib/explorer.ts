import { formatLocation } from "./incident-utils";
import type { Species } from "./types";

export type ExplorerIncident = {
  slug: string;
  title: string;
  species: string;
  subspecies?: string | null;
  dateDisplay?: string | null;
  city?: string | null;
  region?: string | null;
  stateProvince?: string | null;
  country: string;
  lat: number;
  lng: number;
  severity: string;
  summary: string;
  caliber?: string | null;
  firearmType?: string | null;
  defenseOutcome?: string | null;
  sourceType: string;
  verified: boolean;
};

export function toExplorerIncident(row: {
  slug: string;
  title: string;
  species: string;
  subspecies?: string | null;
  dateDisplay?: string | null;
  city?: string | null;
  region?: string | null;
  stateProvince?: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  severity: string;
  summary: string;
  caliber?: string | null;
  firearmType?: string | null;
  defenseOutcome?: string | null;
  sourceType: string;
  verified: boolean;
}): ExplorerIncident | null {
  if (row.lat == null || row.lng == null) return null;
  if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return null;
  return {
    slug: row.slug,
    title: row.title,
    species: row.species,
    subspecies: row.subspecies,
    dateDisplay: row.dateDisplay,
    city: row.city,
    region: row.region,
    stateProvince: row.stateProvince,
    country: row.country,
    lat: row.lat,
    lng: row.lng,
    severity: row.severity,
    summary: row.summary,
    caliber: row.caliber,
    firearmType: row.firearmType,
    defenseOutcome: row.defenseOutcome,
    sourceType: row.sourceType,
    verified: row.verified,
  };
}

export function incidentLocation(inc: ExplorerIncident) {
  return formatLocation(inc);
}

export function initialHiddenSpecies(
  speciesParam?: string,
  hideParam?: string,
): Species[] {
  if (hideParam?.trim()) {
    return hideParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as Species[];
  }
  if (speciesParam?.trim()) {
    const only = speciesParam.trim();
    return (["bear", "mountain_lion", "elk", "moose", "other"] as Species[]).filter(
      (s) => s !== only,
    );
  }
  return [];
}
