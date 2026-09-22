import { writeSync } from "node:fs";
import { prisma } from "../prisma";
import { findExistingIncident, persistOrMerge } from "../ingest/persist";
import { extractPageSnippet } from "./html";
import { cbcAlternateFeedUrls, fetchCbcListingArticles, fetchCbcSearchArticles, isCbcFamilyHost } from "./cbc";
import { discoverFeeds, fetchRssArticles, fetchSearchArticles, fetchSitemapArticles } from "./feeds";
import { mapPool, politeFetch, sleep, withBusyRetry } from "./http";
import { matchAnimalAttack } from "./match";
import { emptyRobots, parseRobotsTxt, robotsAllows, type RobotsRules } from "./robots";
import { BACKFILL_STATES, LEFTOVER_STATES, WESTERN_CORE_STATES, wildlifeRank } from "./states";
import { articleToIncident } from "./to-incident";
import { originOf } from "./domain";
import { isDeadHostError, probeHost } from "./dead-host";
import type { ArticleCandidate } from "./types";

export type CrawlOptions = {
  limit?: number;
  state?: string;
  /** Multiple states, e.g. leftover IL/MA/OH/IN. Combined with `state` if both set. */
  states?: string[];
  /** Include directory rows with no parsed state (domain-only). */
  unstated?: boolean;
  /** Skip these states (well-scanned in a prior session). */
  excludeStates?: string[];
  /** ISO country codes. Default US newspapers; omit / pass several for Canada + agencies. */
  countries?: string[];
  /** Wildlife-dense US states for archive backfill. */
  wildlife?: boolean;
  /** Deep western core only: AK, MT, WY, ID, CO. */
  west?: boolean;
  /** Official wildlife-agency / park press feeds only. */
  agencies?: boolean;
  /** CBC / Radio-Canada regional rows only. */
  cbc?: boolean;
  since?: string;
  dryRun?: boolean;
  concurrency?: number;
  mode?: "incremental" | "backfill";
  newspapersOnly?: boolean;
  force?: boolean;
  minDelayMs?: number;
  skipRecentHours?: number;
  /** RSS + site-search only — skip sitemap walks so archive queries actually run. */
  lite?: boolean;
  /** Per-publication hard cap. Default 150s; west-retry uses 300s. */
  pubTimeoutMs?: number;
  /** Skip hosts already marked dead-host / ENOTFOUND / ECONNREFUSED. */
  skipDead?: boolean;
  /** Only publications that have never been crawled or backfilled. */
  uncrawled?: boolean;
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
  deadSkipped: number;
  deadMarked: number;
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
  country: string | null;
  lat: number | null;
  lng: number | null;
  circulationTier: string | null;
  lastCrawledAt: Date | null;
  lastBackfillAt: Date | null;
  crawlCursor: string | null;
  robotsStatus: string | null;
  lastError: string | null;
};

function timeoutLabel(ms: number) {
  return `pub-timeout-${Math.max(1, Math.round(ms / 1000))}s`;
}

function progress(msg: string) {
  try {
    writeSync(1, `${msg}\n`);
  } catch {
    console.log(msg);
  }
}

async function loadRobots(
  homepageUrl: string,
  minDelayMs: number,
  signal?: AbortSignal,
): Promise<RobotsRules> {
  const origin = originOf(homepageUrl);
  if (!origin) return emptyRobots("error");
  const res = await politeFetch(`${origin}/robots.txt`, {
    accept: "text/plain,*/*",
    minDelayMs,
    timeoutMs: isCbcFamilyHost(homepageUrl) ? 4000 : 8000,
    signal,
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
  const pubTimeoutMs = opts.pubTimeoutMs ?? 150_000;
  const skipDead = Boolean(opts.skipDead);
  const skipRecentHours = opts.skipRecentHours ?? (opts.force ? 0 : mode === "incremental" ? 18 : 72);
  const since = sinceDate(opts);
  const errors: string[] = [];
  const samples: CrawlResult["samples"] = [];
  const byState: CrawlResult["byState"] = {};

  const stateList = [
    ...new Set(
      [
        ...(opts.states ?? []),
        opts.state,
        ...(opts.wildlife ? BACKFILL_STATES : []),
        ...(opts.west ? WESTERN_CORE_STATES : []),
      ]
        .filter((s): s is string => Boolean(s))
        .map((s) => s.toUpperCase()),
    ),
  ];
  const exclude = new Set((opts.excludeStates ?? []).map((s) => s.toUpperCase()));
  const stateClauses: Array<{ state: string | null } | { state: { in: string[] } }> = [];
  if (stateList.length === 1) stateClauses.push({ state: stateList[0] });
  else if (stateList.length > 1) stateClauses.push({ state: { in: stateList } });
  if (opts.unstated) stateClauses.push({ state: null });

  const countries = (opts.countries ?? (opts.agencies ? [] : opts.cbc ? ["CA"] : ["US"]))
    .map((c) => c.toUpperCase())
    .filter(Boolean);
  const where: Record<string, unknown> = { enabled: true };
  if (countries.length === 1) where.country = countries[0];
  else if (countries.length > 1) where.country = { in: countries };
  if (opts.agencies) {
    where.circulationTier = { in: ["agency"] };
  } else if (opts.cbc) {
    where.OR = [
      { domain: { contains: "cbc.ca" } },
      { domain: { contains: "radio-canada.ca" } },
      { homepageUrl: { contains: "cbc.ca" } },
      { homepageUrl: { contains: "radio-canada.ca" } },
    ];
  } else if (opts.newspapersOnly !== false) {
    where.circulationTier = { in: ["newspaper", "weekly", "digital", "other"] };
  }
  if (stateClauses.length === 1) Object.assign(where, stateClauses[0]);
  else if (stateClauses.length > 1) where.OR = stateClauses;

  const publicationsSeeded = await prisma.publication.count(
    countries.length ? { where: { country: { in: countries } } } : undefined,
  );
  const candidates = await prisma.publication.findMany({
    where: where as {
      enabled: boolean;
      country?: string | { in: string[] };
      state?: string | null | { in: string[] };
      circulationTier?: { in: string[] };
      OR?: Array<{ state: string | null } | { state: { in: string[] } }>;
    },
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
      country: true,
      lat: true,
      lng: true,
      circulationTier: true,
      lastCrawledAt: true,
      lastBackfillAt: true,
      crawlCursor: true,
      robotsStatus: true,
      lastError: true,
    },
  });

  const cutoff = skipRecentHours
    ? new Date(Date.now() - skipRecentHours * 3600 * 1000)
    : null;
  const queued = candidates
    .filter((p) => {
      if (/^\?{2,}$/.test(p.name.trim())) return false;
      if (/\.(tw|ru|cn|jp|kr)$/i.test(p.domain)) return false;
      if (p.state && exclude.has(p.state)) return false;
      if (opts.west && mode === "backfill" && p.lastBackfillAt && !opts.force) return false;
      if (skipDead && isDeadHostError(p.lastError)) return false;
      if (opts.uncrawled && (p.lastCrawledAt || p.lastBackfillAt)) return false;
      const stamp = mode === "backfill" ? p.lastBackfillAt : p.lastCrawledAt;
      return opts.force || !cutoff || !stamp || stamp < cutoff;
    })
    .sort((a, b) => {
      const leftoverA = a.state
        ? (LEFTOVER_STATES as readonly string[]).indexOf(a.state)
        : -1;
      const leftoverB = b.state
        ? (LEFTOVER_STATES as readonly string[]).indexOf(b.state)
        : -1;
      const lr = (leftoverA === -1 ? 99 : leftoverA) - (leftoverB === -1 ? 99 : leftoverB);
      if (lr !== 0) return lr;
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
  let deadSkipped = candidates.filter((p) => skipDead && isDeadHostError(p.lastError)).length;
  let deadMarked = 0;

  const bumpState = (st: string | null, field: "scanned" | "matches" | "upserted") => {
    const key = st ?? "??";
    byState[key] ??= { scanned: 0, matches: 0, upserted: 0 };
    byState[key][field] += 1;
  };

  await mapPool(queued, concurrency, async (pub) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), pubTimeoutMs);
    let result: Awaited<ReturnType<typeof crawlOne>>;
    try {
      result = await crawlOne(pub, {
        dryRun,
        mode,
        since: pub.lastCrawledAt ? since : null,
        minDelayMs,
        signal: ctrl.signal,
        lite: Boolean(opts.lite) || pub.country === "CA" || pub.country === "MX",
        timeoutLabel: timeoutLabel(pubTimeoutMs),
      });
    } finally {
      clearTimeout(timer);
    }
    if (result.error && isDeadHostError(result.error)) deadMarked += 1;
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
      progress(
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
    deadSkipped,
    deadMarked,
  };
}

async function crawlOne(
  pub: PubRow,
  opts: {
    dryRun: boolean;
    mode: string;
    since: Date | null;
    minDelayMs: number;
    signal?: AbortSignal;
    lite?: boolean;
    timeoutLabel?: string;
  },
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

  const timedOut = opts.timeoutLabel ?? "pub-timeout-150s";

  try {
    if (opts.signal?.aborted) throw new Error(timedOut);
    const probe = await probeHost(pub.homepageUrl);
    if (!probe.ok) {
      await finishPub(pub, crawlRow.id, {
        robotsStatus: pub.robotsStatus,
        lastError: probe.reason,
        fetched: 0,
        matched: 0,
        upserted: 0,
        skipped: 0,
        backfill: opts.mode === "backfill",
      });
      return {
        fetched: 0,
        matched: 0,
        upserted: 0,
        skipped: 0,
        robotsBlocked: false,
        error: probe.reason,
        samples: [],
      };
    }
    const rules = await loadRobots(pub.homepageUrl, opts.minDelayMs, opts.signal);
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
      const home = await politeFetch(pub.homepageUrl, { minDelayMs: delay, signal: opts.signal });
      if (home.ok) homepageHtml = home.text;
    }

    const discovered = await discoverFeeds(pub.homepageUrl, pub.rssUrl, rules, homepageHtml);
    if (isCbcFamilyHost(pub.homepageUrl) && pub.rssUrl) {
      const preferred = cbcAlternateFeedUrls(pub.rssUrl);
      discovered.rss = [...preferred, ...discovered.rss.filter((u) => !preferred.includes(u))];
    }
    const articles = new Map<string, ArticleCandidate>();

    const add = (item: ArticleCandidate) => {
      if (!afterSince(item.isoDate, opts.since)) return;
      const key = item.url.split("?")[0].toLowerCase();
      if (!articles.has(key)) articles.set(key, item);
    };

    if (opts.signal?.aborted) throw new Error(timedOut);
    const rssCap = isCbcFamilyHost(pub.homepageUrl)
      ? 6
      : opts.lite
        ? 1
        : opts.mode === "backfill"
          ? 6
          : 3;
    const rssTargets = discovered.rss.slice(0, rssCap);
    for (const feed of rssTargets) {
      if (opts.signal?.aborted) throw new Error(timedOut);
      let feedUrl = feed;
      let feedPath = "/";
      try {
        const resolved = new URL(feed, origin || pub.homepageUrl);
        feedUrl = resolved.toString();
        feedPath = resolved.pathname;
      } catch {
        continue;
      }
      if (!robotsAllows(rules, feedPath)) continue;
      const items = await fetchRssArticles(feedUrl, opts.signal);
      for (const item of items) add(item);
      if (items.length) break;
    }

    const rssFilled = [...articles.values()].some((a) => a.source === "rss");
    const skipSitemap =
      Boolean(opts.lite) ||
      (opts.mode === "incremental" && rssFilled && articles.size >= 8) ||
      (opts.mode === "backfill" && rssFilled && articles.size >= 12 && Boolean(pub.rssUrl));
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
        signal: opts.signal,
      });
      for (const item of items) add(item);
    }

    if (opts.mode === "backfill") {
      const searchItems = await fetchSearchArticles(pub.homepageUrl, rules, {
        minDelayMs: delay,
        maxQueries: pub.country === "CA" || pub.country === "MX" ? 4 : 3,
        signal: opts.signal,
        country: pub.country,
      });
      for (const item of searchItems) add(item);
    }

    if (isCbcFamilyHost(pub.homepageUrl) && articles.size < 12) {
      const listing = await fetchCbcListingArticles(pub.homepageUrl, {
        minDelayMs: delay,
        signal: opts.signal,
      });
      for (const item of listing) add(item);
      if (opts.mode === "backfill" && articles.size < 8) {
        const cbcSearch = await fetchCbcSearchArticles(
          pub.homepageUrl,
          pub.country === "CA"
            ? ["bear attack", "attaque ours", "cougar attack", "polar bear"]
            : ["bear attack", "cougar attack"],
          { minDelayMs: delay, signal: opts.signal },
        );
        for (const item of cbcSearch) add(item);
      }
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
      if (opts.signal?.aborted) throw new Error(timedOut);
      let title = article.title;
      let snippet = article.snippet;
      const preview = matchAnimalAttack(title, snippet);
      const titleOnly = matchAnimalAttack(title, "");
      const needsFetch =
        article.source === "sitemap" ||
        (article.source === "search" && !titleOnly.matched) ||
        (!preview.matched && (!title || !snippet) && article.source !== "homepage");

      if (needsFetch) {
        const path = new URL(article.url).pathname;
        if (!robotsAllows(rules, path)) {
          skipped += 1;
          continue;
        }
        const page = await politeFetch(article.url, { minDelayMs: delay, signal: opts.signal });
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
      if (opts.dryRun) {
        const exists = await findExistingIncident(inc);
        if (exists) {
          skipped += 1;
          samples.push({ title: inc.title, url: inc.sources[0].url, publication: pub.name, action: "skip-dup" });
          continue;
        }
        upserted += 1;
        samples.push({
          title: inc.title,
          url: inc.sources[0].url,
          publication: pub.name,
          action: "dry-upsert",
        });
        continue;
      }
      const written = await persistOrMerge(inc);
      if (written.action === "merged") {
        skipped += 1;
        samples.push({ title: inc.title, url: inc.sources[0].url, publication: pub.name, action: "merge-reprint" });
        continue;
      }
      upserted += 1;
      samples.push({
        title: inc.title,
        url: inc.sources[0].url,
        publication: pub.name,
        action: "upsert",
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
    let message = err instanceof Error ? err.message : String(err);
    if (isDeadHostError(message) && !message.startsWith("dead-host")) {
      message = `dead-host: ${message}`;
    }
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
        lastBackfillAt:
          data.backfill && !data.lastError?.startsWith("pub-timeout") ? new Date() : undefined,
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
