import { prisma } from "../prisma";
import { alreadyExists, persistIncident } from "../ingest/persist";
import { extractPageSnippet } from "./html";
import { discoverFeeds, fetchRssArticles, fetchSearchArticles, fetchSitemapArticles } from "./feeds";
import { mapPool, politeFetch, sleep, withBusyRetry } from "./http";
import { matchAnimalAttack } from "./match";
import { emptyRobots, parseRobotsTxt, robotsAllows, type RobotsRules } from "./robots";
import { wildlifeRank } from "./states";
import { articleToIncident } from "./to-incident";
import { originOf } from "./domain";
import type { ArticleCandidate } from "./types";

export type CrawlOptions = {
  limit?: number;
  state?: string;
  since?: string;
  dryRun?: boolean;
  concurrency?: number;
  mode?: "incremental" | "backfill";
  newspapersOnly?: boolean;
  force?: boolean;
  minDelayMs?: number;
  skipRecentHours?: number;
};

export type CrawlResult = {
  publicationsSeeded: number;
  scanned: number;
  fetchedArticles: number;
  matchingArticles: number;
  incidentsUpserted: number;
  skipped: number;
  robotsBlocked: number;
  errors: string[];
  dryRun: boolean;
  mode: string;
  byState: Record<string, { scanned: number; matches: number; upserted: number }>;
  samples: { title: string; url: string; publication: string; action: string }[];
};

type PubRow = {
  id: string;
  name: string;
  homepageUrl: string;
  domain: string;
  rssUrl: string | null;
  sitemapUrl: string | null;
  town: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  circulationTier: string | null;
  lastCrawledAt: Date | null;
  crawlCursor: string | null;
  robotsStatus: string | null;
};

async function loadRobots(homepageUrl: string, minDelayMs: number): Promise<RobotsRules> {
  const origin = originOf(homepageUrl);
  if (!origin) return emptyRobots("error");
  const res = await politeFetch(`${origin}/robots.txt`, {
    accept: "text/plain,*/*",
    minDelayMs,
    timeoutMs: 8000,
  });
  if (!res.ok || !res.text) return emptyRobots(res.status === 404 ? "allow" : "unknown");
  return parseRobotsTxt(res.text, origin);
}

function sinceDate(opts: CrawlOptions): Date | null {
  if (opts.since) {
    const d = new Date(opts.since);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (opts.mode === "incremental") {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 14);
    return d;
  }
  return null;
}

function afterSince(iso: string | null | undefined, since: Date | null): boolean {
  if (!since || !iso) return true;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  return t >= since.getTime();
}

export async function runPublicationCrawl(opts: CrawlOptions = {}): Promise<CrawlResult> {
  const dryRun = Boolean(opts.dryRun);
  const mode = opts.mode ?? "incremental";
  const concurrency = opts.concurrency ?? 8;
  const minDelayMs = opts.minDelayMs ?? 1500;
  const skipRecentHours = opts.skipRecentHours ?? (opts.force ? 0 : mode === "incremental" ? 18 : 72);
  const since = sinceDate(opts);
  const errors: string[] = [];
  const samples: CrawlResult["samples"] = [];
  const byState: CrawlResult["byState"] = {};

  const where: {
    enabled: boolean;
    country: string;
    state?: string;
    circulationTier?: { in: string[] };
  } = { enabled: true, country: "US" };
  if (opts.state) where.state = opts.state.toUpperCase();
  if (opts.newspapersOnly !== false) {
    where.circulationTier = { in: ["newspaper", "weekly", "digital", "other"] };
  }

  const publicationsSeeded = await prisma.publication.count({ where: { country: "US" } });
  const candidates = await prisma.publication.findMany({
    where,
    select: {
      id: true,
      name: true,
      homepageUrl: true,
      domain: true,
      rssUrl: true,
      sitemapUrl: true,
      town: true,
      city: true,
      state: true,
      lat: true,
      lng: true,
      circulationTier: true,
      lastCrawledAt: true,
      crawlCursor: true,
      robotsStatus: true,
    },
  });

  const cutoff = skipRecentHours
    ? new Date(Date.now() - skipRecentHours * 3600 * 1000)
    : null;
  const queued = candidates
    .filter((p) => opts.force || !cutoff || !p.lastCrawledAt || p.lastCrawledAt < cutoff)
    .sort((a, b) => {
      const wr = wildlifeRank(a.state) - wildlifeRank(b.state);
      if (wr !== 0) return wr;
      const ar = a.rssUrl ? 0 : 1;
      const br = b.rssUrl ? 0 : 1;
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name);
    })
    .slice(0, opts.limit ?? candidates.length);

  const ingestRun = await withBusyRetry(() =>
    prisma.ingestRun.create({
      data: { source: `publications:${mode}`, dryRun },
    }),
  );

  let scanned = 0;
  let fetchedArticles = 0;
  let matchingArticles = 0;
  let incidentsUpserted = 0;
  let skipped = 0;
  let robotsBlocked = 0;

  const bumpState = (st: string | null, field: "scanned" | "matches" | "upserted") => {
    const key = st ?? "??";
    byState[key] ??= { scanned: 0, matches: 0, upserted: 0 };
    byState[key][field] += 1;
  };

  await mapPool(queued, concurrency, async (pub) => {
    const result = await crawlOne(pub, {
      dryRun,
      mode,
      since: pub.lastCrawledAt ? since : null,
      minDelayMs,
    });
    scanned += 1;
    fetchedArticles += result.fetched;
    matchingArticles += result.matched;
    incidentsUpserted += result.upserted;
    skipped += result.skipped;
    if (result.robotsBlocked) robotsBlocked += 1;
    if (result.error) errors.push(`${pub.domain}: ${result.error}`);
    bumpState(pub.state, "scanned");
    if (result.matched) {
      byState[pub.state ?? "??"] ??= { scanned: 0, matches: 0, upserted: 0 };
      byState[pub.state ?? "??"].matches += result.matched;
      byState[pub.state ?? "??"].upserted += result.upserted;
    }
    for (const s of result.samples ?? []) {
      if (samples.length < 60) samples.push(s);
    }
    if (scanned % 25 === 0) {
      console.log(
        `[crawl] ${scanned}/${queued.length} pubs · articles=${fetchedArticles} matches=${matchingArticles} upserted=${incidentsUpserted}`,
      );
    }
  });

  await withBusyRetry(() =>
    prisma.ingestRun.update({
      where: { id: ingestRun.id },
      data: {
        finishedAt: new Date(),
        fetched: fetchedArticles,
        upserted: incidentsUpserted,
        skipped,
        errors: errors.slice(0, 40).join("\n") || null,
      },
    }),
  );

  return {
    publicationsSeeded,
    scanned,
    fetchedArticles,
    matchingArticles,
    incidentsUpserted,
    skipped,
    robotsBlocked,
    errors: errors.slice(0, 50),
    dryRun,
    mode,
    byState,
    samples,
  };
}

async function crawlOne(
  pub: PubRow,
  opts: { dryRun: boolean; mode: string; since: Date | null; minDelayMs: number },
): Promise<{
  fetched: number;
  matched: number;
  upserted: number;
  skipped: number;
  robotsBlocked: boolean;
  error?: string;
  samples: CrawlResult["samples"];
}> {
  const samples: CrawlResult["samples"] = [];
  const crawlRow = await withBusyRetry(() =>
    prisma.publicationCrawl.create({
      data: {
        publicationId: pub.id,
        mode: opts.mode,
        dryRun: opts.dryRun,
      },
    }),
  );

  try {
    const rules = await loadRobots(pub.homepageUrl, opts.minDelayMs);
    const origin = originOf(pub.homepageUrl);
    if (!rules.fetchable || (origin && !robotsAllows(rules, "/"))) {
      await finishPub(pub, crawlRow.id, {
        robotsStatus: "disallow",
        lastError: "robots.txt disallows crawling",
        fetched: 0,
        matched: 0,
        upserted: 0,
        skipped: 0,
        backfill: opts.mode === "backfill",
      });
      return { fetched: 0, matched: 0, upserted: 0, skipped: 0, robotsBlocked: true, samples: [] };
    }

    const delay = Math.max(opts.minDelayMs, Math.round((rules.crawlDelaySec ?? 0) * 1000));
    let homepageHtml: string | undefined;
    const needHomepage = !pub.rssUrl && origin && robotsAllows(rules, "/");
    if (needHomepage) {
      const home = await politeFetch(pub.homepageUrl, { minDelayMs: delay });
      if (home.ok) homepageHtml = home.text;
    }

    const discovered = await discoverFeeds(pub.homepageUrl, pub.rssUrl, rules, homepageHtml);
    const articles = new Map<string, ArticleCandidate>();

    const add = (item: ArticleCandidate) => {
      if (!afterSince(item.isoDate, opts.since)) return;
      const key = item.url.split("?")[0].toLowerCase();
      if (!articles.has(key)) articles.set(key, item);
    };

    const rssTargets = discovered.rss.slice(0, opts.mode === "backfill" ? 6 : 3);
    for (const feed of rssTargets) {
      if (!robotsAllows(rules, new URL(feed).pathname)) continue;
      const items = await fetchRssArticles(feed);
      for (const item of items) add(item);
      if (items.length) break;
    }

    const rssFilled = [...articles.values()].some((a) => a.source === "rss");
    const skipSitemap = opts.mode === "incremental" && rssFilled && articles.size >= 8;
    const sitemapCap = opts.mode === "backfill" ? 4 : 2;
    const sitemapTargets = skipSitemap
      ? []
      : [
          ...(pub.sitemapUrl ? [pub.sitemapUrl] : []),
          ...discovered.sitemaps,
        ].slice(0, sitemapCap);
    for (const sm of sitemapTargets) {
      const items = await fetchSitemapArticles(sm, rules, {
        since: opts.since,
        maxUrls: opts.mode === "backfill" ? 120 : 40,
        maxChildSitemaps: opts.mode === "backfill" ? 8 : 3,
        minDelayMs: delay,
      });
      for (const item of items) add(item);
    }

    if (opts.mode === "backfill") {
      const searchItems = await fetchSearchArticles(pub.homepageUrl, rules, {
        minDelayMs: delay,
        maxQueries: 3,
      });
      for (const item of searchItems) add(item);
    }

    if (homepageHtml) {
      const { title, snippet } = extractPageSnippet(homepageHtml);
      if (title) {
        add({
          title,
          url: pub.homepageUrl,
          snippet,
          source: "homepage",
        });
      }
    }

    let matched = 0;
    let upserted = 0;
    let skipped = 0;
    let firstRss: string | null = pub.rssUrl;
    if (!firstRss && discovered.rss.length) firstRss = discovered.rss[0];

    for (const article of articles.values()) {
      let title = article.title;
      let snippet = article.snippet;
      const preview = matchAnimalAttack(title, snippet);
      const needsFetch =
        article.source === "sitemap" ||
        (!preview.matched && (!title || !snippet) && article.source !== "homepage");

      if (needsFetch) {
        const path = new URL(article.url).pathname;
        if (!robotsAllows(rules, path)) {
          skipped += 1;
          continue;
        }
        const page = await politeFetch(article.url, { minDelayMs: delay });
        if (page.ok) {
          const extracted = extractPageSnippet(page.text);
          title = title || extracted.title;
          snippet = snippet || extracted.snippet;
        }
        await sleep(50);
      }

      const filled: ArticleCandidate = { ...article, title, snippet };
      const hit = matchAnimalAttack(filled.title, filled.snippet);
      if (!hit.matched) continue;
      matched += 1;
      const inc = articleToIncident(filled, pub);
      if (!inc) continue;
      const exists = await alreadyExists(inc);
      if (exists) {
        skipped += 1;
        samples.push({ title: inc.title, url: inc.sources[0].url, publication: pub.name, action: "skip-dup" });
        continue;
      }
      if (!opts.dryRun) await persistIncident(inc);
      upserted += 1;
      samples.push({
        title: inc.title,
        url: inc.sources[0].url,
        publication: pub.name,
        action: opts.dryRun ? "dry-upsert" : "upsert",
      });
    }

    await finishPub(pub, crawlRow.id, {
      robotsStatus: rules.status,
      robotsCrawlDelay: rules.crawlDelaySec,
      rssUrl: firstRss,
      sitemapUrl: pub.sitemapUrl ?? discovered.sitemaps[0] ?? null,
      lastError: null,
      fetched: articles.size,
      matched,
      upserted,
      skipped,
      backfill: opts.mode === "backfill",
      scannedDelta: articles.size,
      matchDelta: matched,
    });

    return { fetched: articles.size, matched, upserted, skipped, robotsBlocked: false, samples };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishPub(pub, crawlRow.id, {
      robotsStatus: pub.robotsStatus,
      lastError: message,
      fetched: 0,
      matched: 0,
      upserted: 0,
      skipped: 0,
      backfill: opts.mode === "backfill",
    });
    return { fetched: 0, matched: 0, upserted: 0, skipped: 0, robotsBlocked: false, error: message, samples };
  }
}

async function finishPub(
  pub: PubRow,
  crawlId: string,
  data: {
    robotsStatus: string | null;
    robotsCrawlDelay?: number | null;
    rssUrl?: string | null;
    sitemapUrl?: string | null;
    lastError: string | null;
    fetched: number;
    matched: number;
    upserted: number;
    skipped: number;
    backfill: boolean;
    scannedDelta?: number;
    matchDelta?: number;
  },
) {
  await withBusyRetry(() =>
    prisma.publicationCrawl.update({
      where: { id: crawlId },
      data: {
        finishedAt: new Date(),
        fetched: data.fetched,
        matched: data.matched,
        upserted: data.upserted,
        skipped: data.skipped,
        error: data.lastError,
      },
    }),
  );
  await withBusyRetry(() =>
    prisma.publication.update({
      where: { id: pub.id },
      data: {
        lastCrawledAt: new Date(),
        lastBackfillAt: data.backfill ? new Date() : undefined,
        robotsStatus: data.robotsStatus,
        robotsCheckedAt: new Date(),
        robotsCrawlDelay: data.robotsCrawlDelay ?? undefined,
        rssUrl: data.rssUrl ?? undefined,
        sitemapUrl: data.sitemapUrl ?? undefined,
        lastError: data.lastError,
        scannedArticleCount: { increment: data.scannedDelta ?? 0 },
        matchCount: { increment: data.matchDelta ?? 0 },
      },
    }),
  );
}
