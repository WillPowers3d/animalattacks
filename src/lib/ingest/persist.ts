import { prisma } from "../prisma";
import { geocodeIncident, offsetCoord } from "../geo";
import { dedupeKey, makeExternalKey, makeSlug } from "../incident-utils";
import { extractPlaces, reprintPathKey, sameEvent } from "../publications/event-dedupe";
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

export type ExistingIncident = {
  id: string;
  title: string;
  occurredAt: Date | null;
  city: string | null;
  stateProvince: string | null;
  country: string;
  species: string;
  sourceType: string;
  slug: string;
};

export async function alreadyExists(inc: SeedIncident) {
  return Boolean(await findExistingIncident(inc));
}

export async function findExistingIncident(inc: SeedIncident): Promise<ExistingIncident | null> {
  return withBusyRetry(() => findExistingIncidentOnce(inc));
}

async function findExistingIncidentOnce(inc: SeedIncident): Promise<ExistingIncident | null> {
  const select = {
    id: true,
    title: true,
    occurredAt: true,
    city: true,
    stateProvince: true,
    country: true,
    species: true,
    sourceType: true,
    slug: true,
  } as const;

  const url = inc.sources[0]?.url;
  if (url) {
    const byUrl = await prisma.source.findFirst({
      where: { url },
      select: { incident: { select } },
    });
    if (byUrl?.incident) return byUrl.incident;
    const canonical = url.split("?")[0];
    if (canonical !== url) {
      const byCanon = await prisma.source.findFirst({
        where: { url: canonical },
        select: { incident: { select } },
      });
      if (byCanon?.incident) return byCanon.incident;
    }
    const pathKey = reprintPathKey(url);
    if (pathKey) {
      const pathHits = await prisma.source.findMany({
        where: { url: { contains: pathKey } },
        take: 8,
        select: { url: true, incident: { select } },
      });
      const hit = pathHits.find((row) => reprintPathKey(row.url) === pathKey);
      if (hit?.incident) return hit.incident;
    }
  }

  const key = makeExternalKey(inc);
  const byKey = await prisma.incident.findUnique({ where: { externalKey: key }, select });
  if (byKey) return byKey;

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
      select,
    });
    const incoming = dedupeKey({
      title: inc.title,
      occurredAt: inc.occurredAt,
      city: inc.city,
      stateProvince: inc.stateProvince,
    });
    const exact = sameDay.find(
      (row) =>
        dedupeKey({
          title: row.title,
          occurredAt: row.occurredAt,
          city: row.city,
          stateProvince: row.stateProvince,
        }) === incoming,
    );
    if (exact) return exact;
  }

  return findFuzzyEvent(inc, select);
}

async function findFuzzyEvent(
  inc: SeedIncident,
  select: {
    id: true;
    title: true;
    occurredAt: true;
    city: true;
    stateProvince: true;
    country: true;
    species: true;
    sourceType: true;
    slug: true;
  },
): Promise<ExistingIncident | null> {
  const date = inc.occurredAt ? new Date(inc.occurredAt) : null;
  const windowStart = date ? new Date(date.getTime() - 14 * 86_400_000) : null;
  const windowEnd = date ? new Date(date.getTime() + 14 * 86_400_000) : null;
  const places = extractPlaces(inc.title, inc.city);
  const where: {
    species: string;
    country?: string;
    OR?: Array<Record<string, unknown>>;
  } = { species: inc.species };
  if (inc.country) where.country = inc.country;
  const or: Array<Record<string, unknown>> = [];
  if (date && windowStart && windowEnd) {
    or.push({ occurredAt: { gte: windowStart, lte: windowEnd } });
    or.push({ occurredAt: null });
  }
  if (inc.stateProvince) or.push({ stateProvince: inc.stateProvince });
  if (places[0]) or.push({ title: { contains: places[0].split(" ")[0] } });
  if (or.length) where.OR = or;

  const candidates = await prisma.incident.findMany({
    where,
    select: { ...select, sources: { select: { url: true } } },
    take: 180,
    orderBy: { createdAt: "desc" },
  });

  const incoming = {
    title: inc.title,
    occurredAt: inc.occurredAt,
    city: inc.city,
    stateProvince: inc.stateProvince,
    country: inc.country,
    species: inc.species,
    sourceType: inc.sourceType,
    urls: inc.sources.map((s) => s.url),
  };

  for (const row of candidates) {
    const hit = sameEvent(incoming, {
      title: row.title,
      occurredAt: row.occurredAt,
      city: row.city,
      stateProvince: row.stateProvince,
      country: row.country,
      species: row.species,
      sourceType: row.sourceType,
      urls: row.sources.map((s) => s.url),
    });
    if (hit.match) {
      return {
        id: row.id,
        title: row.title,
        occurredAt: row.occurredAt,
        city: row.city,
        stateProvince: row.stateProvince,
        country: row.country,
        species: row.species,
        sourceType: row.sourceType,
        slug: row.slug,
      };
    }
  }
  return null;
}

export async function attachSources(
  incidentId: string,
  sources: SeedIncident["sources"],
) {
  for (const s of sources) {
    const exists = await prisma.source.findFirst({
      where: { incidentId, url: s.url },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.source.create({
      data: {
        incidentId,
        url: s.url,
        title: s.title ?? null,
        publisher: s.publisher ?? null,
      },
    });
  }
}

function incomingPlaceIsBetter(existing: ExistingIncident, inc: SeedIncident): boolean {
  const incomingPlaces = extractPlaces(inc.title, inc.city);
  if (!incomingPlaces.length || !inc.city) return false;
  const existingInTitle = extractPlaces(existing.title, existing.city);
  if (existingInTitle.some((p) => incomingPlaces.includes(p))) return false;
  return incomingPlaces.some(
    (p) =>
      (inc.city ? p.includes(inc.city.toLowerCase()) : false) || inc.title.toLowerCase().includes(p),
  );
}

export function withCoords(inc: SeedIncident): SeedIncident {
  if (inc.lat != null && inc.lng != null) return inc;
  const geo = offsetCoord(geocodeIncident(inc), `${inc.title}${inc.occurredAt ?? ""}`);
  return { ...inc, lat: geo.lat, lng: geo.lng };
}

export async function persistIncident(inc: SeedIncident) {
  return withBusyRetry(() => persistIncidentOnce(inc));
}

export async function persistOrMerge(
  inc: SeedIncident,
): Promise<{ action: "created" | "merged"; id: string; slug?: string }> {
  const existing = await findExistingIncident(inc);
  if (existing) {
    await attachSources(existing.id, inc.sources);
    if (incomingPlaceIsBetter(existing, inc) && inc.city) {
      const located = withCoords(inc);
      await prisma.incident.update({
        where: { id: existing.id },
        data: {
          city: located.city ?? existing.city,
          stateProvince: located.stateProvince ?? existing.stateProvince,
          lat: located.lat ?? undefined,
          lng: located.lng ?? undefined,
          occurredAt: existing.occurredAt ?? (located.occurredAt ? new Date(located.occurredAt) : undefined),
          dateDisplay: existing.occurredAt ? undefined : located.dateDisplay ?? undefined,
        },
      });
    }
    return { action: "merged", id: existing.id, slug: existing.slug };
  }
  const row = await persistIncident(inc);
  return { action: "created", id: row.id, slug: row.slug };
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
