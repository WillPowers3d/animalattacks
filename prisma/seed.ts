import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { geocodeIncident, offsetCoord } from "../src/lib/geo";
import { makeExternalKey, makeSlug } from "../src/lib/incident-utils";
import { seedPublications } from "../src/lib/publications/seed";
import type { SeedIncident } from "../src/lib/types";

const prisma = new PrismaClient();
const ROOT = path.join(import.meta.dirname, "..");

function loadJson(rel: string): SeedIncident[] {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8")) as SeedIncident[];
}

async function upsertIncident(inc: SeedIncident) {
  const geo = offsetCoord(
    geocodeIncident(inc),
    `${inc.title}${inc.occurredAt ?? ""}`,
  );
  const lat = geo.lat;
  const lng = geo.lng;
  const externalKey = makeExternalKey(inc);
  const slug = makeSlug(inc.title, inc.occurredAt, externalKey);

  const data = {
    slug,
    title: inc.title,
    species: inc.species,
    subspecies: inc.subspecies ?? null,
    occurredAt: inc.occurredAt ? new Date(inc.occurredAt) : null,
    datePrecision: inc.datePrecision ?? "unknown",
    dateDisplay: inc.dateDisplay ?? null,
    city: inc.city ?? null,
    region: inc.region ?? null,
    stateProvince: inc.stateProvince ?? null,
    country: inc.country,
    lat,
    lng,
    severity: inc.severity,
    summary: inc.summary,
    sourceType: inc.sourceType,
    verified: inc.verified ?? false,
    firearmType: inc.firearmType ?? null,
    caliber: inc.caliber ?? null,
    shotsFired: inc.shotsFired ?? null,
    defenseOutcome: inc.defenseOutcome ?? null,
    combinationDefense: inc.combinationDefense ?? false,
    attribution: inc.attribution ?? null,
    externalKey,
  };

  const row = await prisma.incident.upsert({
    where: { externalKey },
    create: {
      ...data,
      sources: {
        create: inc.sources.map((s) => ({
          url: s.url,
          title: s.title ?? null,
          publisher: s.publisher ?? null,
        })),
      },
    },
    update: data,
  });

  if (inc.sources.length) {
    for (const s of inc.sources) {
      const exists = await prisma.source.findFirst({
        where: { incidentId: row.id, url: s.url },
      });
      if (!exists) {
        await prisma.source.create({
          data: {
            incidentId: row.id,
            url: s.url,
            title: s.title ?? null,
            publisher: s.publisher ?? null,
          },
        });
      }
    }
  }
  return row;
}

async function main() {
  const weingarten = loadJson("data/weingarten-incidents.json");
  const extra = loadJson("data/extra-incidents.json");
  const all = [...weingarten, ...extra];
  console.log(`Seeding ${all.length} incidents (${weingarten.length} Weingarten, ${extra.length} extra)`);
  let n = 0;
  for (const inc of all) {
    await upsertIncident(inc);
    n += 1;
    if (n % 40 === 0) console.log(`  ${n}/${all.length}`);
  }
  console.log(`Seeded ${n} incidents.`);
  await seedPublications({ log: true });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
