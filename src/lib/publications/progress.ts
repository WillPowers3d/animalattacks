/**
 * Durable crawl checkpoint so ephemeral SQLite can be rebuilt on a new VM
 * without re-scanning finished publications or losing local-paper incidents.
 *
 *   data/publications/crawl-progress.json
 *   data/publications/local-paper-incidents.json
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../prisma";
import { persistOrMerge } from "../ingest/persist";
import type { SeedIncident } from "../types";

export const PROGRESS_PATH = "data/publications/crawl-progress.json";
export const LOCAL_INCIDENTS_PATH = "data/publications/local-paper-incidents.json";

export type ProgressPub = {
  lastCrawledAt: string;
  lastBackfillAt?: string | null;
  scannedArticleCount: number;
  matchCount: number;
  robotsStatus?: string | null;
  lastError?: string | null;
  rssUrl?: string | null;
};

export type CrawlProgressFile = {
  generatedAt: string;
  publications: Record<string, ProgressPub>;
};

function rootDir() {
  return path.join(import.meta.dirname, "..", "..", "..");
}

export function progressFilePath() {
  return path.join(rootDir(), PROGRESS_PATH);
}

export function localIncidentsFilePath() {
  return path.join(rootDir(), LOCAL_INCIDENTS_PATH);
}

export async function exportCrawlProgress(): Promise<{
  domains: number;
  incidents: number;
}> {
  const pubs = await prisma.publication.findMany({
    where: { lastCrawledAt: { not: null } },
    select: {
      domain: true,
      lastCrawledAt: true,
      lastBackfillAt: true,
      scannedArticleCount: true,
      matchCount: true,
      robotsStatus: true,
      lastError: true,
      rssUrl: true,
    },
  });
  const publications: Record<string, ProgressPub> = {};
  for (const p of pubs) {
    if (!p.lastCrawledAt) continue;
    publications[p.domain] = {
      lastCrawledAt: p.lastCrawledAt.toISOString(),
      lastBackfillAt: p.lastBackfillAt?.toISOString() ?? null,
      scannedArticleCount: p.scannedArticleCount,
      matchCount: p.matchCount,
      robotsStatus: p.robotsStatus,
      lastError: p.lastError,
      rssUrl: p.rssUrl,
    };
  }
  const file: CrawlProgressFile = {
    generatedAt: new Date().toISOString(),
    publications,
  };
  fs.writeFileSync(progressFilePath(), JSON.stringify(file));

  const incidents = await prisma.incident.findMany({
    where: { publicationId: { not: null } },
    include: { sources: true, publication: { select: { domain: true } } },
  });
  const payload: (SeedIncident & { publicationDomain?: string | null })[] = incidents.map((inc) => ({
    title: inc.title,
    species: inc.species as SeedIncident["species"],
    subspecies: inc.subspecies,
    occurredAt: inc.occurredAt ? inc.occurredAt.toISOString().slice(0, 10) : null,
    datePrecision: inc.datePrecision as SeedIncident["datePrecision"],
    dateDisplay: inc.dateDisplay,
    city: inc.city,
    region: inc.region,
    stateProvince: inc.stateProvince,
    country: inc.country as SeedIncident["country"],
    lat: inc.lat ?? undefined,
    lng: inc.lng ?? undefined,
    severity: inc.severity as SeedIncident["severity"],
    summary: inc.summary,
    sourceType: inc.sourceType as SeedIncident["sourceType"],
    verified: inc.verified,
    firearmType: inc.firearmType as SeedIncident["firearmType"],
    caliber: inc.caliber,
    shotsFired: inc.shotsFired,
    defenseOutcome: inc.defenseOutcome as SeedIncident["defenseOutcome"],
    combinationDefense: inc.combinationDefense,
    attribution: inc.attribution,
    publicationDomain: inc.publication?.domain ?? null,
    sources: inc.sources.map((s) => ({
      url: s.url,
      title: s.title ?? undefined,
      publisher: s.publisher ?? undefined,
    })),
  }));
  fs.writeFileSync(localIncidentsFilePath(), JSON.stringify(payload, null, 2));
  return { domains: pubs.length, incidents: payload.length };
}

export async function applyCrawlProgress(opts: { log?: boolean } = {}) {
  const p = progressFilePath();
  if (!fs.existsSync(p)) {
    if (opts.log) console.log("No crawl-progress.json — starting with a fresh lastCrawledAt ledger.");
    return { applied: 0, incidents: 0 };
  }
  const file = JSON.parse(fs.readFileSync(p, "utf8")) as CrawlProgressFile;
  const entries = Object.entries(file.publications ?? {});
  let applied = 0;
  const chunk = 80;
  for (let i = 0; i < entries.length; i += chunk) {
    const slice = entries.slice(i, i + chunk);
    await prisma.$transaction(
      slice.map(([domain, row]) =>
        prisma.publication.updateMany({
          where: { domain },
          data: {
            lastCrawledAt: new Date(row.lastCrawledAt),
            lastBackfillAt: row.lastBackfillAt ? new Date(row.lastBackfillAt) : undefined,
            scannedArticleCount: row.scannedArticleCount ?? 0,
            matchCount: row.matchCount ?? 0,
            robotsStatus: row.robotsStatus ?? undefined,
            lastError: row.lastError ?? undefined,
            rssUrl: row.rssUrl ?? undefined,
          },
        }),
      ),
    );
    applied += slice.length;
    if (opts.log && applied % 1000 === 0) console.log(`  progress applied ${applied}/${entries.length}`);
  }

  let incidents = 0;
  const incPath = localIncidentsFilePath();
  if (fs.existsSync(incPath)) {
    const rows = JSON.parse(fs.readFileSync(incPath, "utf8")) as (SeedIncident & {
      publicationDomain?: string | null;
    })[];
    const domains = [
      ...new Set(rows.map((r) => r.publicationDomain).filter((d): d is string => Boolean(d))),
    ];
    const pubs = domains.length
      ? await prisma.publication.findMany({
          where: { domain: { in: domains } },
          select: { id: true, domain: true },
        })
      : [];
    const byDomain = new Map(pubs.map((p) => [p.domain, p.id]));
    for (const inc of rows) {
      const publicationId = inc.publicationDomain ? byDomain.get(inc.publicationDomain) : undefined;
      await persistOrMerge({ ...inc, publicationId });
      incidents += 1;
    }
  }
  const relinked = await relinkIncidentsToPublications();
  if (opts.log) {
    console.log(
      `Applied crawl progress for ${applied} domains, ${incidents} local-paper incidents, relinked ${relinked}.`,
    );
  }
  return { applied, incidents, relinked };
}

export async function relinkIncidentsToPublications(): Promise<number> {
  const pubs = await prisma.publication.findMany({
    select: { id: true, domain: true, name: true },
  });
  const byHost = new Map<string, string>();
  for (const p of pubs) {
    const host = p.domain.split("/")[0].replace(/^www\./, "").toLowerCase();
    if (host && !byHost.has(host)) byHost.set(host, p.id);
  }
  const orphans = await prisma.incident.findMany({
    where: { publicationId: null, sourceType: { in: ["news", "agency"] } },
    include: { sources: { select: { url: true, publisher: true } } },
  });
  let n = 0;
  for (const inc of orphans) {
    let pubId: string | undefined;
    for (const s of inc.sources) {
      try {
        const host = new URL(s.url).hostname.replace(/^www\./, "").toLowerCase();
        pubId = byHost.get(host);
        if (pubId) break;
      } catch {
        /* skip */
      }
    }
    if (!pubId && inc.sources[0]?.publisher) {
      const named = pubs.find((p) => p.name === inc.sources[0].publisher);
      pubId = named?.id;
    }
    if (!pubId) continue;
    await prisma.incident.update({ where: { id: inc.id }, data: { publicationId: pubId } });
    n += 1;
  }
  return n;
}
