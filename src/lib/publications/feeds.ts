import Parser from "rss-parser";
import { canonicalArticleUrl, originOf } from "./domain";
import { extractAlternateFeeds, extractSearchResultLinks, extractSitemapLocs, isSitemapIndex } from "./html";
import { politeFetch } from "./http";
import { SEARCH_QUERIES, SEARCH_QUERIES_CA, urlLooksLikeMatch } from "./match";
import { robotsAllows, type RobotsRules } from "./robots";
import type { ArticleCandidate } from "./types";

const rssParser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": "animalattacks-tracker/1.0" },
  maxRedirects: 3,
});

const COMMON_FEED_PATHS = [
  "/feed",
  "/rss",
  "/rss.xml",
  "/feed.xml",
  "/atom.xml",
  "/index.xml",
  "/feeds/rss",
  "/rss/index.xml",
];

const COMMON_SITEMAP_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/sitemap-index.xml",
  "/news-sitemap.xml",
  "/sitemap-news.xml",
  "/sitemaps/news.xml",
];

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return "/";
  }
}

export async function discoverFeeds(
  homepageUrl: string,
  knownRss: string | null,
  rules: RobotsRules,
  homepageHtml?: string,
): Promise<{ rss: string[]; sitemaps: string[] }> {
  const origin = originOf(homepageUrl) ?? homepageUrl;
  const rss = new Set<string>();
  const sitemaps = new Set<string>(rules.sitemaps);
  if (knownRss) {
    try {
      rss.add(new URL(knownRss, origin.endsWith("/") ? origin : `${origin}/`).toString());
    } catch {
      /* skip unresolvable seed RSS */
    }
  }

  if (homepageHtml) {
    for (const f of extractAlternateFeeds(homepageHtml, origin)) rss.add(f);
  }

  for (const p of COMMON_FEED_PATHS) {
    if (robotsAllows(rules, p)) rss.add(new URL(p, origin).toString());
  }
  for (const p of COMMON_SITEMAP_PATHS) {
    if (robotsAllows(rules, p)) sitemaps.add(new URL(p, origin).toString());
  }
  return { rss: [...rss], sitemaps: [...sitemaps] };
}

export async function fetchRssArticles(feedUrl: string, signal?: AbortSignal): Promise<ArticleCandidate[]> {
  if (signal?.aborted) return [];
  try {
    const feed = await rssParser.parseURL(feedUrl);
    const items: ArticleCandidate[] = [];
    for (const entry of feed.items ?? []) {
      const url = entry.link ? canonicalArticleUrl(entry.link) : "";
      const title = (entry.title ?? "").trim();
      if (!url || !title) continue;
      items.push({
        title,
        url,
        snippet: (entry.contentSnippet ?? entry.content ?? "").replace(/<[^>]+>/g, " ").slice(0, 400),
        isoDate: entry.isoDate ?? entry.pubDate ?? null,
        source: "rss",
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function fetchSitemapArticles(
  sitemapUrl: string,
  rules: RobotsRules,
  opts: {
    since?: Date | null;
    maxUrls?: number;
    maxChildSitemaps?: number;
    minDelayMs?: number;
    signal?: AbortSignal;
  },
): Promise<ArticleCandidate[]> {
  const seenMaps = new Set<string>();
  const queue = [sitemapUrl];
  const urls: { loc: string; lastmod?: string }[] = [];
  const maxChild = opts.maxChildSitemaps ?? 6;
  const since = opts.since ?? null;

  while (queue.length && seenMaps.size < maxChild) {
    if (opts.signal?.aborted) break;
    const next = queue.shift()!;
    if (seenMaps.has(next)) continue;
    if (!robotsAllows(rules, pathOf(next))) continue;
    seenMaps.add(next);
    const res = await politeFetch(next, {
      accept: "application/xml,text/xml,*/*",
      minDelayMs: opts.minDelayMs,
      signal: opts.signal,
    });
    if (!res.ok || !res.text) continue;
    const locs = extractSitemapLocs(res.text);
    if (isSitemapIndex(res.text)) {
      for (const loc of locs) {
        if (/news|post|article|story/i.test(loc.loc) || locs.length < 20) queue.push(loc.loc);
        else queue.push(loc.loc);
      }
      continue;
    }
    for (const loc of locs) urls.push(loc);
  }

  const maxUrls = opts.maxUrls ?? 80;
  const prioritized = urls
    .filter((u) => {
      if (!since || !u.lastmod) return true;
      const t = Date.parse(u.lastmod);
      return Number.isNaN(t) ? true : t >= since.getTime();
    })
    .sort((a, b) => {
      const am = urlLooksLikeMatch(a.loc) ? 0 : 1;
      const bm = urlLooksLikeMatch(b.loc) ? 0 : 1;
      if (am !== bm) return am - bm;
      const at = a.lastmod ? Date.parse(a.lastmod) : 0;
      const bt = b.lastmod ? Date.parse(b.lastmod) : 0;
      return bt - at;
    })
    .slice(0, maxUrls);

  return prioritized.map((u) => ({
    title: "",
    url: canonicalArticleUrl(u.loc),
    snippet: "",
    isoDate: u.lastmod ?? null,
    source: "sitemap" as const,
  }));
}

export async function fetchSearchArticles(
  homepageUrl: string,
  rules: RobotsRules,
  opts: {
    minDelayMs?: number;
    maxQueries?: number;
    signal?: AbortSignal;
    country?: string | null;
  } = {},
): Promise<ArticleCandidate[]> {
  const origin = originOf(homepageUrl);
  if (!origin) return [];
  const pool = opts.country === "CA" ? SEARCH_QUERIES_CA : SEARCH_QUERIES;
  const queries = pool.slice(0, opts.maxQueries ?? 4);
  const out: ArticleCandidate[] = [];
  const seen = new Set<string>();

  const templates = (q: string) => [
    `/?s=${encodeURIComponent(q)}`,
    `/search/${encodeURIComponent(q)}`,
    `/search?q=${encodeURIComponent(q)}`,
  ];

  for (const q of queries) {
    if (opts.signal?.aborted) break;
    for (const path of templates(q)) {
      if (!robotsAllows(rules, path)) continue;
      const url = new URL(path, origin).toString();
      const res = await politeFetch(url, { minDelayMs: opts.minDelayMs, signal: opts.signal });
      if (!res.ok || !res.text) continue;
      if (/just a moment|captcha|enable javascript|access denied/i.test(res.text.slice(0, 2000))) {
        continue;
      }
      for (const item of extractSearchResultLinks(res.text, origin)) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        out.push({ ...item, snippet: item.snippet });
      }
      if (out.length) break;
    }
  }
  return out;
}
