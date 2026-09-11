/**
 * Print geocode coverage for seed JSON (city / state / country).
 * Usage: npx tsx scripts/geocode-report.ts
 */
import fs from "node:fs";
import path from "node:path";
import { resolveGeocode, type GeocodePrecision } from "../src/lib/geo";
import type { SeedIncident } from "../src/lib/types";

const ROOT = path.join(import.meta.dirname, "..");

function load(rel: string): SeedIncident[] {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8")) as SeedIncident[];
}

function classify(inc: SeedIncident): GeocodePrecision {
  return resolveGeocode(inc).precision;
}

function report(label: string, rows: SeedIncident[]) {
  const counts: Record<GeocodePrecision, number> = { city: 0, state: 0, country: 0 };
  let stored = 0;
  for (const inc of rows) {
    counts[classify(inc)] += 1;
    if (inc.lat != null && inc.lng != null) stored += 1;
  }
  const mappable = counts.city + counts.state;
  console.log(`\n${label}: ${rows.length} incidents`);
  console.log(`  stored lat/lng in JSON : ${stored}`);
  console.log(`  city-level geocode     : ${counts.city}`);
  console.log(`  state/province centroid: ${counts.state}`);
  console.log(`  country fallback       : ${counts.country}`);
  console.log(`  mappable (city+state)  : ${mappable} / ${rows.length} (${Math.round((mappable / rows.length) * 100)}%)`);
  return { ...counts, stored, total: rows.length, mappable };
}

const weingarten = load("data/weingarten-incidents.json");
const extra = load("data/extra-incidents.json");
const all = [...weingarten, ...extra];
const w = report("Weingarten / Ammoland", weingarten);
const e = report("Extra public incidents", extra);
const t = report("All seed incidents", all);

console.log("\n--- totals ---");
console.log(JSON.stringify({ weingarten: w, extra: e, all: t }, null, 2));
