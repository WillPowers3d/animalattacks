/**
 * Keep crawling uncrawled newspapers in batches until time/budget runs out.
 * Resume-friendly: each batch skips recently crawled rows.
 *
 *   npx tsx scripts/crawl-waves.ts --hours=2 --batch=600 --concurrency=12
 */
import { runPublicationCrawl } from "../src/lib/publications/crawl";
import { prisma } from "../src/lib/prisma";

function flag(name: string): string | undefined {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

const hours = Number(flag("hours") ?? "2");
const batch = Number(flag("batch") ?? "500");
const concurrency = Number(flag("concurrency") ?? "12");
const backfill = process.argv.includes("--backfill");
const deadline = Date.now() + hours * 3600 * 1000;

async function remaining() {
  return prisma.publication.count({
    where: {
      enabled: true,
      country: "US",
      lastCrawledAt: null,
      circulationTier: { in: ["newspaper", "weekly", "digital", "other"] },
    },
  });
}

async function main() {
  let wave = 0;
  const totals = { scanned: 0, matches: 0, upserted: 0, articles: 0 };
  while (Date.now() < deadline) {
    const left = await remaining();
    if (left === 0) {
      console.log("No uncrawled newspapers remain.");
      break;
    }
    wave += 1;
    const minsLeft = Math.round((deadline - Date.now()) / 60000);
    console.log(`\n=== wave ${wave} · ${left} remaining · ${minsLeft} min left · batch ${batch} ===`);
    const result = await runPublicationCrawl({
      limit: batch,
      concurrency,
      mode: backfill ? "backfill" : "incremental",
      since: "1990-01-01",
      newspapersOnly: true,
    });
    totals.scanned += result.scanned;
    totals.matches += result.matchingArticles;
    totals.upserted += result.incidentsUpserted;
    totals.articles += result.fetchedArticles;
    console.log(JSON.stringify({ wave, ...result, runningTotals: totals }, null, 2));
    if (result.scanned === 0) break;
  }
  console.log(JSON.stringify({ done: true, waves: wave, totals }, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
