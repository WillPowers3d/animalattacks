import { prisma } from "../prisma";
import { geocodeIncident, offsetCoord } from "../geo";
import { dedupeKey, makeExternalKey, makeSlug } from "../incident-utils";
import { NEWS_QUERIES, fetchNewsItems } from "./news";
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
  warnings: string[];
  samples: { title: string; url: string; action: string }[];
  facebookMode: "live" | "mock";
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

function withCoords(inc: SeedIncident): SeedIncident {
  if (inc.lat != null && inc.lng != null) return inc;
  const geo = offsetCoord(geocodeIncident(inc), `${inc.title}${inc.occurredAt ?? ""}`);
  return { ...inc, lat: geo.lat, lng: geo.lng };
}

async function persist(inc: SeedIncident) {
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
      updatedAt: new Date(),
    },
  });
  return row;
}

export async function runIngest(opts: IngestOptions = {}): Promise<IngestResult> {
  const dryRun = Boolean(opts.dryRun);
  const errors: string[] = [];
  const warnings: string[] = [];
  const samples: IngestResult["samples"] = [];
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  const facebookMode: IngestResult["facebookMode"] =
    process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_IDS ? "live" : "mock";

  const run = await prisma.ingestRun.create({
    data: { source: "news+facebook", dryRun },
  });

  try {
    const news = await fetchNewsItems();
    fetched += news.items.length;
    if (news.failures.length) {
      for (const fail of news.failures) {
        warnings.push(`RSS "${fail.query}": ${fail.error}`);
      }
    }
    if (!news.items.length && news.failures.length) {
      errors.push(
        `News ingest fetched 0 items. ${news.failures.length} RSS quer${news.failures.length === 1 ? "y" : "ies"} failed. Check network egress to news.google.com.`,
      );
    } else if (news.failures.length === NEWS_QUERIES.length) {
      errors.push("Every Google News RSS query failed.");
    }

    for (const item of news.items) {
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
      if (facebookMode === "live" && posts.length === 0) {
        errors.push(
          "Facebook Graph returned no posts. Check FACEBOOK_ACCESS_TOKEN (long-lived Page token) and FACEBOOK_PAGE_IDS.",
        );
      }
      if (facebookMode === "mock") {
        warnings.push("Facebook: FACEBOOK_ACCESS_TOKEN / FACEBOOK_PAGE_IDS unset — using labeled mock posts.");
      }
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

  const errorText = [...errors, ...warnings.map((w) => `warn: ${w}`)].join("\n") || null;

  await prisma.ingestRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      fetched,
      upserted,
      skipped,
      errors: errorText,
    },
  });

  return {
    fetched,
    upserted,
    skipped,
    dryRun,
    errors,
    warnings,
    samples: samples.slice(0, 40),
    facebookMode,
  };
}
