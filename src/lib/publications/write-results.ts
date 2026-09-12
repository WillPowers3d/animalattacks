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

  const stateRows = byState
    .map((s) => ({
      state: s.state ?? "??",
      name: US_STATE_NAMES[s.state ?? ""] ?? "",
      scanned: s._count._all,
      matches: s._sum.matchCount ?? 0,
      articles: s._sum.scannedArticleCount ?? 0,
    }))
    .sort((a, b) => b.scanned - a.scanned);

  const snapshot = [
    "## Latest snapshot",
    "",
    `Generated **${new Date().toISOString()}** on this machine’s SQLite database.`,
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Publications in directory | ${seeded.toLocaleString()} |`,
    `| Scanned at least once | **${crawled.toLocaleString()}** |`,
    `| Uncrawled newspapers remaining | ${remaining.toLocaleString()} |`,
    `| Article records fetched | **${(sums._sum.scannedArticleCount ?? 0).toLocaleString()}** |`,
    `| Matching articles | **${(sums._sum.matchCount ?? 0).toLocaleString()}** |`,
    `| Publications with a match | ${matchedPubs.toLocaleString()} |`,
    `| Incidents from local papers | **${local.toLocaleString()}** |`,
    `| Incidents total (incl. historical seed) | ${totalInc.toLocaleString()} |`,
    "",
    "### Coverage by state (scanned publications)",
    "",
    "| State | Scanned | Articles | Matches |",
    "| --- | ---: | ---: | ---: |",
    ...stateRows.map((s) => `| ${s.state} ${s.name} | ${s.scanned} | ${s.articles} | ${s.matches} |`),
    "",
    "### Local-paper incidents by species",
    "",
    ...bySpecies
      .sort((a, b) => b._count._all - a._count._all)
      .map((s) => `- ${s.species}: ${s._count._all}`),
    "",
    "### Local-paper incidents by state",
    "",
    ...localByState
      .sort((a, b) => b._count._all - a._count._all)
      .map((s) => `- ${s.stateProvince ?? "??"}: ${s._count._all}`),
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
    publicationsScanned: crawled,
    remainingNewspapers: remaining,
    articlesFetched: sums._sum.scannedArticleCount ?? 0,
    matchingArticles: sums._sum.matchCount ?? 0,
    publicationsWithMatches: matchedPubs,
    incidentsFromLocalPapers: local,
    incidentsTotal: totalInc,
    crawledStates: stateRows,
    localIncidentsBySpecies: Object.fromEntries(bySpecies.map((s) => [s.species, s._count._all])),
    localIncidentsByState: Object.fromEntries(
      localByState.map((s) => [s.stateProvince ?? "??", s._count._all]),
    ),
  };
  fs.writeFileSync(
    path.join(process.cwd(), "data/publications/crawl-session-report.json"),
    JSON.stringify(report, null, 2),
  );
  return report;
}
