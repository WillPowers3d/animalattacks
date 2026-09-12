import fs from "node:fs";
import path from "node:path";
import { prisma } from "../prisma";
import { US_STATE_NAMES } from "./states";

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
  crawledStates: { state: string; name: string; scanned: number; matches: number; articles: number }[];
  localIncidentsBySpecies: Record<string, number>;
  localIncidentsByState: Record<string, number>;
};

export async function writeResultsReport(): Promise<SessionReport> {
  const [seeded, crawled, remaining, matchedPubs, sums, local, totalInc, byState, bySpecies, localByState] =
    await Promise.all([
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
    ]);

  const liveStateRows = byState
    .map((s) => ({
      state: s.state ?? "??",
      name: US_STATE_NAMES[s.state ?? ""] ?? "",
      scanned: s._count._all,
      matches: s._sum.matchCount ?? 0,
      articles: s._sum.scannedArticleCount ?? 0,
    }))
    .sort((a, b) => b.scanned - a.scanned);

  const priorPath = path.join(process.cwd(), "data/publications/prior-session-report.json");
  let prior: SessionReport | null = null;
  if (fs.existsSync(priorPath)) {
    prior = JSON.parse(fs.readFileSync(priorPath, "utf8")) as SessionReport;
  }

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
  const priorRemaining = prior?.remainingNewspapers ?? remaining;
  const priorScanned = prior?.publicationsScanned ?? 0;
  const newlyCovered = Math.max(0, mergedScanned - priorScanned);
  const remainingEst = Math.max(0, priorRemaining - newlyCovered);
  const mergedLocal = (prior?.incidentsFromLocalPapers ?? 0) + local;
  const mergedMatchedPubs = Math.max(matchedPubs, prior?.publicationsWithMatches ?? 0) + (local > 0 ? local : 0);
  const mergedMatchCount = mergedMatches + local;
  const speciesMap: Record<string, number> = { ...(prior?.localIncidentsBySpecies ?? {}) };
  for (const s of bySpecies) {
    speciesMap[s.species] = (speciesMap[s.species] ?? 0) + s._count._all;
  }
  const localStateMap: Record<string, number> = { ...(prior?.localIncidentsByState ?? {}) };
  for (const s of localByState) {
    const key = s.stateProvince ?? "??";
    localStateMap[key] = (localStateMap[key] ?? 0) + s._count._all;
  }

  const snapshot = [
    "## Latest snapshot",
    "",
    `Generated **${new Date().toISOString()}**. Combined with prior-session aggregates (lost ephemeral SQLite) plus this VM’s leftover-state wave.`,
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Publications in directory | ${seeded.toLocaleString()} |`,
    `| Scanned at least once (combined) | **${mergedScanned.toLocaleString()}** |`,
    `| This-VM leftover wave scanned | ${crawled.toLocaleString()} |`,
    `| Uncrawled newspapers remaining (est.) | ${remainingEst.toLocaleString()} |`,
    `| Article records fetched (combined) | **${mergedArticles.toLocaleString()}** |`,
    `| This-VM leftover articles | ${(sums._sum.scannedArticleCount ?? 0).toLocaleString()} |`,
    `| Matching articles (combined) | **${mergedMatchCount.toLocaleString()}** |`,
    `| This-VM leftover matches | ${local.toLocaleString()} |`,
    `| Publications with a match | ${mergedMatchedPubs.toLocaleString()} |`,
    `| Incidents from local papers (combined) | **${mergedLocal.toLocaleString()}** |`,
    `| This-VM leftover incidents | ${local.toLocaleString()} |`,
    `| Incidents total (incl. historical seed) | ${((prior?.incidentsTotal ?? totalInc) + local).toLocaleString()} |`,
    "",
    "### Coverage by state (scanned publications)",
    "",
    "| State | Scanned | Articles | Matches |",
    "| --- | ---: | ---: | ---: |",
    ...stateRows.map((s) => `| ${s.state} ${s.name} | ${s.scanned} | ${s.articles} | ${s.matches} |`),
    "",
    "### Local-paper incidents by species",
    "",
    ...Object.entries(speciesMap)
      .sort((a, b) => b[1] - a[1])
      .map(([species, n]) => `- ${species}: ${n}`),
    "",
    "### Local-paper incidents by state",
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
    articlesFetched: mergedArticles,
    matchingArticles: mergedMatchCount,
    publicationsWithMatches: mergedMatchedPubs,
    incidentsFromLocalPapers: mergedLocal,
    incidentsTotal: (prior?.incidentsTotal ?? totalInc) + local,
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
