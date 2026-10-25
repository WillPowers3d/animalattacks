import { prisma } from "../prisma";
import { geocodeIncident, offsetCoord } from "../geo";
import { dedupeKey, makeExternalKey, makeSlug } from "../incident-utils";
import type { SeedIncident } from "../types";

async function withBusyRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!/busy|locked|database is locked/i.test(msg)) throw err;
      await new Promise((r) => setTimeout(r, 80 * (i + 1)));
    }
  }
  throw last;
}

export async function alreadyExists(inc: SeedIncident) {
  return withBusyRetry(() => alreadyExistsOnce(inc));
}

async function alreadyExistsOnce(inc: SeedIncident) {
  const url = inc.sources[0]?.url;
  if (url) {
    const byUrl = await prisma.source.findFirst({
      where: { url },
      select: { id: true },
    });
    if (byUrl) return true;
    const canonical = url.split("?")[0];
    if (canonical !== url) {
      const byCanon = await prisma.source.findFirst({
        where: { url: canonical },
        select: { id: true },
      });
      if (byCanon) return true;
    }
  }
  const key = makeExternalKey(inc);
  const byKey = await prisma.incident.findUnique({ where: { externalKey: key } });
  if (byKey) return true;

  if (inc.occurredAt && inc.title) {
    const date = new Date(inc.occurredAt);
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    const sameDay = await prisma.incident.findMany({
      where: {
        occurredAt: { gte: start, lte: end },
        city: inc.city ?? undefined,
        stateProvince: inc.stateProvince ?? undefined,
      },
      select: { title: true, occurredAt: true, city: true, stateProvince: true },
    });
    const incoming = dedupeKey({
      title: inc.title,
      occurredAt: inc.occurredAt,
      city: inc.city,
      stateProvince: inc.stateProvince,
    });
    return sameDay.some(
      (row) =>
        dedupeKey({
          title: row.title,
          occurredAt: row.occurredAt,
          city: row.city,
          stateProvince: row.stateProvince,
        }) === incoming,
    );
  }
  return false;
}

export function withCoords(inc: SeedIncident): SeedIncident {
  if (inc.lat != null && inc.lng != null) return inc;
  const geo = offsetCoord(geocodeIncident(inc), `${inc.title}${inc.occurredAt ?? ""}`);
  return { ...inc, lat: geo.lat, lng: geo.lng };
}

export async function persistIncident(inc: SeedIncident) {
  return withBusyRetry(() => persistIncidentOnce(inc));
}

async function persistIncidentOnce(inc: SeedIncident) {
  const located = withCoords(inc);
  const externalKey = makeExternalKey(located);
  const slug = makeSlug(located.title, located.occurredAt, externalKey);
  const data = {
    slug,
    title: located.title,
    species: located.species,
    subspecies: located.subspecies ?? null,
    occurredAt: located.occurredAt ? new Date(located.occurredAt) : null,
    datePrecision: located.datePrecision ?? "unknown",
    dateDisplay: located.dateDisplay ?? null,
    city: located.city ?? null,
    region: located.region ?? null,
    stateProvince: located.stateProvince ?? null,
    country: located.country,
    lat: located.lat ?? null,
    lng: located.lng ?? null,
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
    publicationId: inc.publicationId ?? null,
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
    update: {
      title: data.title,
      summary: data.summary,
      lat: data.lat,
      lng: data.lng,
      city: data.city,
      stateProvince: data.stateProvince,
      publicationId: data.publicationId ?? undefined,
      updatedAt: new Date(),
    },
  });
  return row;
}
