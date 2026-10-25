import Parser from "rss-parser";
import type { SeedIncident } from "../types";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "animalattacks-tracker/1.0" },
});

export const NEWS_QUERIES = [
  { q: "bear attack United States OR Canada OR Alaska OR Montana", species: "bear" as const },
  { q: "grizzly bear attack Montana OR Wyoming OR Alaska OR Idaho", species: "bear" as const },
  { q: "black bear attack", species: "bear" as const },
  { q: "fatal bear attack Alaska OR Montana OR Wyoming OR Canada", species: "bear" as const },
  { q: "mountain lion attack OR cougar attack United States OR Canada", species: "mountain_lion" as const },
  { q: "cougar mauls OR mountain lion mauls", species: "mountain_lion" as const },
  { q: "elk attack OR elk gores visitor park", species: "elk" as const },
  { q: "moose attack Alaska OR Colorado OR Canada", species: "moose" as const },
  { q: "moose tramples OR moose gores", species: "moose" as const },
];

function rssUrl(query: string) {
  const encoded = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
}

export type NewsItem = {
  title: string;
  url: string;
  isoDate?: string;
  contentSnippet?: string;
  source?: string;
  species: SeedIncident["species"];
};

export type NewsFetchResult = {
  items: NewsItem[];
  failures: { query: string; error: string }[];
};

export async function fetchNewsItems(): Promise<NewsFetchResult> {
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  const failures: NewsFetchResult["failures"] = [];

  for (const query of NEWS_QUERIES) {
    try {
      const feed = await parser.parseURL(rssUrl(query.q));
      const entries = feed.items ?? [];
      for (const entry of entries) {
        const url = entry.link ?? "";
        const title = entry.title ?? "";
        if (!url || !title) continue;
        const key = url.split("?")[0].toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          title,
          url,
          isoDate: entry.isoDate,
          contentSnippet: entry.contentSnippet ?? entry.content,
          source: entry.creator ?? feed.title,
          species: query.species,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.warn(`RSS fetch failed for "${query.q}":`, error);
      failures.push({ query: query.q, error });
    }
  }
  return { items, failures };
}
