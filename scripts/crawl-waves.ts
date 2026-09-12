/**
 * Keep crawling uncrawled newspapers in batches until time/budget runs out.
 * Resume-friendly: each batch skips recently crawled rows.
 * After every wave, writes RESULTS.md + crawl-progress.json so a new VM can resume.
 *
 *   npx tsx scripts/crawl-waves.ts --hours=2 --batch=600 --concurrency=12
 *   npx tsx scripts/crawl-waves.ts --hours=3 --batch=400 --concurrency=12 --states=IL,MA,OH,IN --unstated
 */
import { writeSync } from "node:fs";
import { runPublicationCrawl } from "../src/lib/publications/crawl";
import { exportCrawlProgress } from "../src/lib/publications/progress";
import { writeResultsReport } from "../src/lib/publications/write-results";
import { prisma } from "../src/lib/prisma";

function log(msg: string) {
  try {
    writeSync(1, `${msg}\n`);
  } catch {
    console.log(msg);
  }
}

function flag(name: string): string | undefined {
  const exact = process.argv.find((a) => a === `--${name}`);
  if (exact) return "1";
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

const hours = Number(flag("hours") ?? "2");
const batch = Number(flag("batch") ?? "500");
const concurrency = Number(flag("concurrency") ?? "12");
const backfill = process.argv.includes("--backfill");
const unstated = Boolean(flag("unstated"));
const statesRaw = flag("states");
const states = statesRaw
  ? statesRaw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  : undefined;
const deadline = Date.now() + hours * 3600 * 1000;

async function remaining() {
  const stateClauses: Array<{ state: string | null } | { state: { in: string[] } }> = [];
  if (states?.length === 1) stateClauses.push({ state: states[0] });
  else if (states && states.length > 1) stateClauses.push({ state: { in: states } });
  if (unstated) stateClauses.push({ state: null });
  return prisma.publication.count({
    where: {
      enabled: true,
      country: "US",
      lastCrawledAt: null,
      circulationTier: { in: ["newspaper", "weekly", "digital", "other"] },
      ...(stateClauses.length === 1
        ? stateClauses[0]
        : stateClauses.length > 1
          ? { OR: stateClauses }
          : {}),
    },
  });
}

async function main() {
  let wave = 0;
  const totals = { scanned: 0, matches: 0, upserted: 0, articles: 0 };
  while (Date.now() < deadline) {
    const left = await remaining();
    if (left === 0) {
      console.log("No uncrawled newspapers remain for this filter.");
      break;
    }
    wave += 1;
    const minsLeft = Math.round((deadline - Date.now()) / 60000);
    log(
      `\n=== wave ${wave} · ${left} remaining · ${minsLeft} min left · batch ${batch}${
        states ? ` · states ${states.join(",")}` : ""
      }${unstated ? " · +unstated" : ""} ===`,
    );
    const result = await runPublicationCrawl({
      limit: batch,
      concurrency,
      mode: backfill ? "backfill" : "incremental",
      since: "1990-01-01",
      newspapersOnly: true,
      states,
      unstated,
    });
    totals.scanned += result.scanned;
    totals.matches += result.matchingArticles;
    totals.upserted += result.incidentsUpserted;
    totals.articles += result.fetchedArticles;
    console.log(JSON.stringify({ wave, ...result, runningTotals: totals }, null, 2));
    try {
      const exported = await exportCrawlProgress();
      const report = await writeResultsReport();
      log(
        `[checkpoint] progress domains=${exported.domains} localIncidents=${exported.incidents} scanned=${report.publicationsScanned} remaining=${report.remainingNewspapers}`,
      );
    } catch (err) {
      log(`[checkpoint] failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (result.scanned === 0) break;
  }
  console.log(JSON.stringify({ done: true, waves: wave, totals }, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
