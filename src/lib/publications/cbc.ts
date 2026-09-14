import { extractPageSnippet, extractSearchResultLinks } from "./html";
import { politeFetch } from "./http";
import { canonicalArticleUrl } from "./domain";
import type { ArticleCandidate } from "./types";

const CBC_HOST_RE = /(^|\.)cbc\.ca$/i;
const RC_HOST_RE = /(^|\.)radio-canada\.ca$/i;

export function isCbcFamilyHost(urlOrHost: string): boolean {
  try {
    const host = urlOrHost.includes("://") ? new URL(urlOrHost).hostname : urlOrHost;
    const h = host.replace(/^www\./, "").toLowerCase();
    return CBC_HOST_RE.test(h) || RC_HOST_RE.test(h);
  } catch {
    return /cbc\.ca|radio-canada\.ca/i.test(urlOrHost);
  }
}

/** Alternate CBC RSS paths — webfeed often stalls on HTTP/2; cmlink / rss.cbc.ca are HTTP/1.1-friendly. */
export function cbcAlternateFeedUrls(primary: string): string[] {
  const out = new Set<string>([primary]);
  try {
    const u = new URL(primary);
    const slug = u.pathname.split("/").filter(Boolean).pop() ?? "";
    const region = slug.replace(/^rss-canada-/, "").replace(/^rss-/, "");
    if (u.hostname.includes("cbc.ca") && region) {
      out.add(`https://www.cbc.ca/cmlink/rss-canada-${region}`);
      out.add(`https://rss.cbc.ca/lineup/canada-${region}.xml`);
      out.add(`https://www.cbc.ca/webfeed/rss/rss-canada-${region}`);
    }
    if (u.hostname.includes("radio-canada.ca")) {
      out.add(primary.replace("/en-continu", ""));
      out.add(primary.endsWith("/rss") ? primary : `${primary.replace(/\/$/, "")}/rss`);
    }
  } catch {
    /* keep primary */
  }
  return [...out];
}

export function extractCbcListingArticles(html: string, base: string): ArticleCandidate[] {
  const items: ArticleCandidate[] = [];
  const seen = new Set<string>();
  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) {
    const href = m[1];
    const title = (m[2] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (!href || title.length < 18) continue;
    if (!/\/(news|nouvelle|article|radio)\//i.test(href) && !/\d{6,}/.test(href)) continue;
    if (/\/(search|login|donate|listen|watch|sports|olympics)\b/i.test(href)) continue;
    let url: string;
    try {
      url = canonicalArticleUrl(new URL(href, base).toString());
    } catch {
      continue;
    }
    if (!/cbc\.ca|radio-canada\.ca/i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({ title: title.slice(0, 180), url, snippet: "", source: "listing" });
  }
  return items.slice(0, 50);
}

export async function fetchCbcListingArticles(
  homepageUrl: string,
  opts: { minDelayMs?: number; signal?: AbortSignal } = {},
): Promise<ArticleCandidate[]> {
  const res = await politeFetch(homepageUrl, {
    minDelayMs: opts.minDelayMs ?? 1500,
    timeoutMs: 20000,
    forceHttp11: true,
    signal: opts.signal,
  });
  if (!res.ok || !res.text) return [];
  const fromListing = extractCbcListingArticles(res.text, homepageUrl);
  if (fromListing.length) return fromListing;
  return extractSearchResultLinks(res.text, homepageUrl).map((item) => ({
    ...item,
    source: "listing" as const,
  }));
}

export async function fetchCbcSearchArticles(
  homepageUrl: string,
  queries: string[],
  opts: { minDelayMs?: number; signal?: AbortSignal } = {},
): Promise<ArticleCandidate[]> {
  const origin = (() => {
    try {
      return new URL(homepageUrl).origin;
    } catch {
      return null;
    }
  })();
  if (!origin) return [];
  const out: ArticleCandidate[] = [];
  const seen = new Set<string>();
  for (const q of queries.slice(0, 3)) {
    if (opts.signal?.aborted) break;
    const searchUrl = origin.includes("radio-canada")
      ? `${origin}/recherche?q=${encodeURIComponent(q)}`
      : `https://www.cbc.ca/search?q=${encodeURIComponent(q)}`;
    const res = await politeFetch(searchUrl, {
      minDelayMs: opts.minDelayMs ?? 1600,
      timeoutMs: 20000,
      forceHttp11: true,
      signal: opts.signal,
    });
    if (!res.ok || !res.text) continue;
    const items = [
      ...extractCbcListingArticles(res.text, searchUrl),
      ...extractSearchResultLinks(res.text, origin),
    ];
    for (const item of items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      out.push({ ...item, source: item.source === "search" ? "search" : "listing" });
    }
    if (out.length >= 8) break;
  }
  return out.slice(0, 40);
}

export function listingSnippetFallback(html: string): { title: string; snippet: string } {
  return extractPageSnippet(html);
}
