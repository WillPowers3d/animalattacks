import { canonicalArticleUrl } from "./domain";
import type { ArticleCandidate } from "./types";

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripTags(s: string) {
  return decodeEntities(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function meta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]);
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
      "i",
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return decodeEntities(m2[1]);
  }
  return null;
}

export function extractPageSnippet(html: string): { title: string; snippet: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title =
    meta(html, ["og:title", "twitter:title"]) ??
    (titleMatch ? stripTags(titleMatch[1]) : "");
  const snippet =
    meta(html, ["og:description", "description", "twitter:description"]) ?? "";
  return { title: title.slice(0, 220), snippet: snippet.slice(0, 400) };
}

export function extractAlternateFeeds(html: string, base: string): string[] {
  const feeds: string[] = [];
  const re =
    /<link[^>]+rel=["'][^"']*alternate[^"']*["'][^>]*>/gi;
  const typeRe = /type=["']([^"']+)["']/i;
  const hrefRe = /href=["']([^"']+)["']/i;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const type = tag.match(typeRe)?.[1] ?? "";
    const href = tag.match(hrefRe)?.[1];
    if (!href) continue;
    if (!/rss|atom|xml/i.test(type) && !/rss|atom|feed/i.test(href)) continue;
    try {
      feeds.push(new URL(href, base).toString());
    } catch {
      /* ignore */
    }
  }
  return [...new Set(feeds)];
}

export function extractSearchResultLinks(html: string, base: string): ArticleCandidate[] {
  const items: ArticleCandidate[] = [];
  const seen = new Set<string>();
  const patterns = [
    /<(?:h1|h2|h3)[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+class=["'][^"']*(?:entry-title|post-title|headline)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    /<article[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const href = m[1];
      const title = stripTags(m[2]);
      if (!href || !title || title.length < 8) continue;
      if (/^(home|menu|search|subscribe|login|advertisement)$/i.test(title)) continue;
      let url: string;
      try {
        url = canonicalArticleUrl(new URL(href, base).toString());
      } catch {
        continue;
      }
      if (seen.has(url)) continue;
      seen.add(url);
      items.push({ title, url, snippet: "", source: "search" });
    }
  }
  return items.slice(0, 40);
}

export function extractSitemapLocs(xml: string): { loc: string; lastmod?: string }[] {
  const out: { loc: string; lastmod?: string }[] = [];
  const blocks = xml.split(/<url>|<sitemap>/i).slice(1);
  if (blocks.length) {
    for (const block of blocks) {
      const loc = block.match(/<loc>\s*([^<]+)\s*<\/loc>/i)?.[1]?.trim();
      if (!loc) continue;
      const lastmod = block.match(/<lastmod>\s*([^<]+)\s*<\/lastmod>/i)?.[1]?.trim();
      out.push({ loc: decodeEntities(loc), lastmod });
    }
    return out;
  }
  const locRe = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRe.exec(xml))) {
    out.push({ loc: decodeEntities(m[1].trim()) });
  }
  return out;
}

export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex/i.test(xml);
}
