import { prisma } from "../prisma";
import { dedupeKey, makeExternalKey, makeSlug } from "../incident-utils";
import { fetchNewsItems } from "./news";
import { heuristicParse, maybeEnrichWithOpenAI } from "./parse";
import { facebookToIncident, fetchFacebookPosts } from "./facebook";
import type { SeedIncident } from "../types";

export type IngestOptions = {
  dryRun?: boolean;
  includeFacebook?: boolean;
  enrich?: boolean;
};

export type IngestResult = {
  fetched: number;
  upserted: number;
  skipped: number;
  dryRun: boolean;
  errors: string[];
  samples: { title: string; url: string; action: string }[];
};

async function alreadyExists(inc: SeedIncident) {
  const url = inc.sources[0]?.url;
  if (url) {
    const byUrl = await prisma.source.findFirst({
      where: { url },
      select: { id: true },
    });
    if (byUrl) return true;
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

async function persist(inc: SeedIncident) {
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
    lat: inc.lat ?? null,
    lng: inc.lng ?? null,
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
    update: {
      title: data.title,
      summary: data.summary,
      updatedAt: new Date(),
    },
  });
  return row;
}

export async function runIngest(opts: IngestOptions = {}): Promise<IngestResult> {
  const dryRun = Boolean(opts.dryRun);
  const errors: string[] = [];
  const samples: IngestResult["samples"] = [];
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;

  const run = await prisma.ingestRun.create({
    data: { source: "news+facebook", dryRun },
  });

  try {
    const news = await fetchNewsItems();
    fetched += news.length;
    for (const item of news) {
      let inc = heuristicParse(item);
      if (opts.enrich) inc = await maybeEnrichWithOpenAI(inc);
      const exists = await alreadyExists(inc);
      if (exists) {
        skipped += 1;
        samples.push({ title: inc.title, url: inc.sources[0]?.url ?? "", action: "skip-dup" });
        continue;
      }
      if (!dryRun) await persist(inc);
      upserted += 1;
      samples.push({ title: inc.title, url: inc.sources[0]?.url ?? "", action: dryRun ? "dry-upsert" : "upsert" });
    }

    if (opts.includeFacebook !== false) {
      const posts = await fetchFacebookPosts();
      fetched += posts.length;
      for (const post of posts) {
        const inc = facebookToIncident(post);
        if (!inc) {
          skipped += 1;
          continue;
        }
        const exists = await alreadyExists(inc);
        if (exists) {
          skipped += 1;
          continue;
        }
        if (!dryRun) await persist(inc);
        upserted += 1;
        samples.push({
          title: inc.title,
          url: inc.sources[0]?.url ?? "",
          action: dryRun ? "dry-fb" : "upsert-fb",
        });
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  await prisma.ingestRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      fetched,
      upserted,
      skipped,
      errors: errors.length ? errors.join("\n") : null,
    },
  });

  return { fetched, upserted, skipped, dryRun, errors, samples: samples.slice(0, 40) };
}
