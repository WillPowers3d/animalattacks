/**
 * CBC / Radio-Canada attack stories via Google News (site:) + regional listing pages.
 * Uses HTTP/1.1 politeFetch. Upserts through persistOrMerge (reprint-aware).
 */
import Parser from "rss-parser";
import { persistOrMerge } from "../src/lib/ingest/persist";
import { fetchCbcListingArticles } from "../src/lib/publications/cbc";
import { extractPageSnippet } from "../src/lib/publications/html";
import { politeFetch } from "../src/lib/publications/http";
import { matchAnimalAttack } from "../src/lib/publications/match";
import { prisma } from "../src/lib/prisma";
import { articleToIncident } from "../src/lib/publications/to-incident";
import type { ArticleCandidate } from "../src/lib/publications/types";

const LISTINGS = [
  "https://www.cbc.ca/news/canada/north",
  "https://www.cbc.ca/news/canada/british-columbia",
  "https://www.cbc.ca/news/canada/calgary",
  "https://www.cbc.ca/news/canada/edmonton",
  "https://www.cbc.ca/news/canada/saskatchewan",
  "https://www.cbc.ca/news/canada/manitoba",
  "https://www.cbc.ca/news/canada/thunder-bay",
  "https://www.cbc.ca/news/canada/sudbury",
  "https://ici.radio-canada.ca/grand-nord",
];

const QUERIES = [
  "bear attack site:cbc.ca",
  "cougar attack OR polar bear attack site:cbc.ca",
  "grizzly attack Canada site:cbc.ca",
  "attaque ours OR attaque couguar site:ici.radio-canada.ca",
];

const parser = new Parser({ timeout: 15000, headers: { "User-Agent": "animalattacks-tracker/1.0" } });

async function googleItems(q: string): Promise<ArticleCandidate[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-CA&gl=CA&ceid=CA:en`;
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? [])
      .map((entry) => ({
        title: (entry.title ?? "").trim(),
        url: entry.link ?? "",
        snippet: (entry.contentSnippet ?? "").slice(0, 400),
        isoDate: entry.isoDate ?? entry.pubDate ?? null,
        source: "rss" as const,
      }))
      .filter((a) => a.url && a.title);
  } catch {
    return [];
  }
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const pubs = await prisma.publication.findMany({
    where: {
      OR: [{ domain: { contains: "cbc.ca" } }, { homepageUrl: { contains: "radio-canada.ca" } }],
    },
  });
  const fallback = pubs[0];
  const articles = new Map<string, ArticleCandidate>();
  for (const q of QUERIES) {
    for (const item of await googleItems(q)) {
      articles.set(item.url.split("?")[0], item);
    }
  }
  for (const listing of LISTINGS) {
    const items = await fetchCbcListingArticles(listing, { minDelayMs: 800 });
    for (const item of items) articles.set(item.url.split("?")[0], item);
  }

  let matched = 0;
  let created = 0;
  let merged = 0;
  const samples: string[] = [];
  for (const article of articles.values()) {
    let title = article.title;
    let snippet = article.snippet;
    let hit = matchAnimalAttack(title, snippet);
    if (!hit.matched && article.source === "listing") {
      const page = await politeFetch(article.url, { minDelayMs: 700, timeoutMs: 12000, forceHttp11: true });
      if (page.ok) {
        const extracted = extractPageSnippet(page.text);
        title = title || extracted.title;
        snippet = snippet || extracted.snippet;
        hit = matchAnimalAttack(title, snippet);
      }
    }
    if (!hit.matched) continue;
    matched += 1;
    const host = (() => {
      try {
        return new URL(article.url).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })();
    const pub =
      pubs.find((p) => p.homepageUrl.includes(host) || p.domain.includes(host.split(".")[0])) ?? fallback;
    if (!pub) continue;
    const inc = articleToIncident({ ...article, title, snippet }, pub);
    if (!inc) continue;
    inc.country = "CA";
    if (dry) {
      samples.push(`dry ${inc.title}`);
      created += 1;
      continue;
    }
    const result = await persistOrMerge(inc);
    if (result.action === "created") created += 1;
    else merged += 1;
    samples.push(`${result.action} ${inc.title}`);
  }

  const report = {
    dryRun: dry,
    articles: articles.size,
    matched,
    created,
    merged,
    samples: samples.slice(0, 25),
  };
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
