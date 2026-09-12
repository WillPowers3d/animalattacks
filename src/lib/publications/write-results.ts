import fs from "node:fs";
import path from "node:path";
import { prisma } from "../prisma";
import { regionName } from "./states";
import { LOCAL_INCIDENTS_PATH } from "./progress";

export type SessionReport = {
  generatedAt: string;
  publicationsSeeded: number;
  publicationsScanned: number;
  remainingNewspapers: number;
  articlesFetched: number;
  matchingArticles: number;
  publicationsWithMatches: number;
  incidentsFromLocalPapers: number;
  incidentsTotal: number;
  canadaPublications?: number;
  canadaScanned?: number;
  agencyPublications?: number;
  agencyScanned?: number;
  incidentsByCountry?: Record<string, number>;
  incidentsBySource?: Record<string, number>;
  crawledStates: { state: string; name: string; scanned: number; matches: number; articles: number }[];
  localIncidentsBySpecies: Record<string, number>;
  localIncidentsByState: Record<string, number>;
};

function loadJson(rel: string): SessionReport | null {
  const p = path.join(process.cwd(), rel);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as SessionReport;
  } catch {
    return null;
  }
}

function restoredLocalCount() {
  const p = path.join(process.cwd(), LOCAL_INCIDENTS_PATH);
  if (!fs.existsSync(p)) return 0;
  try {
    const rows = JSON.parse(fs.readFileSync(p, "utf8")) as unknown[];
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

export async function writeResultsReport(): Promise<SessionReport> {
  const [
    seeded,
    crawled,
    remaining,
    matchedPubs,
    sums,
    local,
    totalInc,
    byState,
    bySpecies,
    localByState,
    canadaPubs,
    canadaScanned,
    agencyPubs,
    agencyScanned,
    byCountry,
    bySource,
  ] = await Promise.all([
    prisma.publication.count(),
    prisma.publication.count({ where: { lastCrawledAt: { not: null } } }),
    prisma.publication.count({
      where: {
        enabled: true,
        lastCrawledAt: null,
        circulationTier: { in: ["newspaper", "weekly", "digital", "other"] },
      },
    }),
    prisma.publication.count({ where: { matchCount: { gt: 0 } } }),
    prisma.publication.aggregate({ _sum: { matchCount: true, scannedArticleCount: true } }),
    prisma.incident.count({ where: { publicationId: { not: null } } }),
    prisma.incident.count(),
    prisma.publication.groupBy({
      by: ["state"],
      where: { lastCrawledAt: { not: null } },
      _count: { _all: true },
      _sum: { matchCount: true, scannedArticleCount: true },
    }),
    prisma.incident.groupBy({
      by: ["species"],
      where: { publicationId: { not: null } },
      _count: { _all: true },
    }),
    prisma.incident.groupBy({
      by: ["stateProvince"],
      where: { publicationId: { not: null } },
      _count: { _all: true },
    }),
    prisma.publication.count({ where: { country: "CA" } }),
    prisma.publication.count({ where: { country: "CA", lastCrawledAt: { not: null } } }),
    prisma.publication.count({ where: { circulationTier: "agency" } }),
    prisma.publication.count({ where: { circulationTier: "agency", lastCrawledAt: { not: null } } }),
    prisma.incident.groupBy({ by: ["country"], _count: { _all: true } }),
    prisma.incident.groupBy({ by: ["sourceType"], _count: { _all: true } }),
  ]);

  const liveStateRows = byState
    .map((s) => ({
      state: s.state ?? "??",
      name: regionName(s.state),
      scanned: s._count._all,
      matches: s._sum.matchCount ?? 0,
      articles: s._sum.scannedArticleCount ?? 0,
    }))
    .sort((a, b) => b.scanned - a.scanned);

  const prior = loadJson("data/publications/crawl-session-report.json") ?? loadJson("data/publications/prior-session-report.json");

  const mergedByState = new Map<string, SessionReport["crawledStates"][number]>();
  for (const row of prior?.crawledStates ?? []) mergedByState.set(row.state, { ...row });
  for (const row of liveStateRows) {
    const old = mergedByState.get(row.state);
    if (!old) {
      mergedByState.set(row.state, { ...row });
      continue;
    }
    mergedByState.set(row.state, {
      state: row.state,
      name: row.name || old.name,
      scanned: Math.max(old.scanned, row.scanned),
      articles: Math.max(old.articles, row.articles),
      matches: Math.max(old.matches, row.matches),
    });
  }
  const stateRows = [...mergedByState.values()].sort((a, b) => b.scanned - a.scanned);

  const mergedScanned = stateRows.reduce((n, s) => n + s.scanned, 0);
  const mergedArticles = stateRows.reduce((n, s) => n + s.articles, 0);
  const mergedMatches = stateRows.reduce((n, s) => n + s.matches, 0);
  const restored = restoredLocalCount();
  const newLocal = Math.max(0, local - restored);
  const mergedLocal = (prior?.incidentsFromLocalPapers ?? 0) + newLocal;
  const mergedMatchedPubs = Math.max(matchedPubs, prior?.publicationsWithMatches ?? 0);
  const remainingEst = Math.max(0, remaining);
  const speciesMap: Record<string, number> = { ...(prior?.localIncidentsBySpecies ?? {}) };
  for (const s of bySpecies) {
    speciesMap[s.species] = Math.max(speciesMap[s.species] ?? 0, s._count._all);
  }
  const localStateMap: Record<string, number> = { ...(prior?.localIncidentsByState ?? {}) };
  for (const s of localByState) {
    const key = s.stateProvince ?? "??";
    localStateMap[key] = Math.max(localStateMap[key] ?? 0, s._count._all);
  }
  const countryMap: Record<string, number> = { ...(prior?.incidentsByCountry ?? {}) };
  for (const s of byCountry) countryMap[s.country] = Math.max(countryMap[s.country] ?? 0, s._count._all);
  const sourceMap: Record<string, number> = { ...(prior?.incidentsBySource ?? {}) };
  for (const s of bySource) sourceMap[s.sourceType] = Math.max(sourceMap[s.sourceType] ?? 0, s._count._all);

  const snapshot = [
    "## Latest snapshot",
    "",
    `Generated **${new Date().toISOString()}**. Combined with the committed first-pass baseline plus this VM’s Canada / agency / wildlife-backfill wave.`,
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Publications in directory | ${seeded.toLocaleString()} |`,
    `| Scanned at least once (combined) | **${mergedScanned.toLocaleString()}** |`,
    `| This-VM pubs scanned | ${crawled.toLocaleString()} |`,
    `| Uncrawled newspapers remaining | ${remainingEst.toLocaleString()} |`,
    `| Article records fetched (combined) | **${Math.max(mergedArticles, sums._sum.scannedArticleCount ?? 0).toLocaleString()}** |`,
    `| This-VM articles | ${(sums._sum.scannedArticleCount ?? 0).toLocaleString()} |`,
    `| Matching articles (combined) | **${Math.max(mergedMatches, prior?.matchingArticles ?? 0).toLocaleString()}** |`,
    `| This-VM publication-linked incidents | ${local.toLocaleString()} |`,
    `| New incidents this wave (beyond restored) | ${newLocal.toLocaleString()} |`,
    `| Publications with a match | ${mergedMatchedPubs.toLocaleString()} |`,
    `| Incidents from local / agency feeds (combined) | **${mergedLocal.toLocaleString()}** |`,
    `| Canada publications (seeded / scanned) | ${canadaPubs} / ${canadaScanned} |`,
    `| Agency feeds (seeded / scanned) | ${agencyPubs} / ${agencyScanned} |`,
    `| Incidents total | ${Math.max(prior?.incidentsTotal ?? 0, totalInc).toLocaleString()} |`,
    "",
    "### Incidents by country",
    "",
    ...Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `- ${c}: ${n}`),
    "",
    "### Incidents by source type",
    "",
    ...Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `- ${c}: ${n}`),
    "",
    "### Coverage by state / province (scanned publications)",
    "",
    "| Region | Scanned | Articles | Matches |",
    "| --- | ---: | ---: | ---: |",
    ...stateRows.map((s) => `| ${s.state} ${s.name} | ${s.scanned} | ${s.articles} | ${s.matches} |`),
    "",
    "### Local / agency incidents by species",
    "",
    ...Object.entries(speciesMap)
      .sort((a, b) => b[1] - a[1])
      .map(([species, n]) => `- ${species}: ${n}`),
    "",
    "### Local / agency incidents by region",
    "",
    ...Object.entries(localStateMap)
      .sort((a, b) => b[1] - a[1])
      .map(([st, n]) => `- ${st}: ${n}`),
    "",
  ].join("\n");

  const resultsPath = path.join(process.cwd(), "RESULTS.md");
  const existing = fs.readFileSync(resultsPath, "utf8");
  const marker = "## Latest snapshot";
  const kept = existing.includes(marker) ? existing.slice(0, existing.indexOf(marker)).trimEnd() : existing.trimEnd();
  fs.writeFileSync(resultsPath, `${kept}\n\n${snapshot}\n`);

  const report: SessionReport = {
    generatedAt: new Date().toISOString(),
    publicationsSeeded: seeded,
    publicationsScanned: mergedScanned,
    remainingNewspapers: remainingEst,
    articlesFetched: Math.max(mergedArticles, sums._sum.scannedArticleCount ?? 0),
    matchingArticles: Math.max(mergedMatches, prior?.matchingArticles ?? 0),
    publicationsWithMatches: mergedMatchedPubs,
    incidentsFromLocalPapers: mergedLocal,
    incidentsTotal: Math.max(prior?.incidentsTotal ?? 0, totalInc),
    canadaPublications: canadaPubs,
    canadaScanned,
    agencyPublications: agencyPubs,
    agencyScanned,
    incidentsByCountry: countryMap,
    incidentsBySource: sourceMap,
    crawledStates: stateRows,
    localIncidentsBySpecies: speciesMap,
    localIncidentsByState: localStateMap,
  };
  fs.writeFileSync(
    path.join(process.cwd(), "data/publications/crawl-session-report.json"),
    JSON.stringify(report, null, 2),
  );
  return report;
}
