export type CirculationTier =
  | "newspaper"
  | "weekly"
  | "digital"
  | "tv"
  | "radio"
  | "broadcast"
  | "agency"
  | "other";

export type PublicationSeed = {
  name: string;
  homepageUrl: string;
  domain: string;
  rssUrl?: string | null;
  sitemapUrl?: string | null;
  town?: string | null;
  city?: string | null;
  state?: string | null;
  county?: string | null;
  country: "US" | "CA" | "MX";
  lat?: number | null;
  lng?: number | null;
  circulationTier?: CirculationTier | string | null;
  directorySource: string;
  wikidataId?: string | null;
  notes?: string | null;
};

export type DirectoryManifest = {
  generatedAt: string;
  publicationCount: number;
  uniqueDomains: number;
  byState: Record<string, number>;
  byTier: Record<string, number>;
  bySource: Record<string, number>;
  withCoords: number;
  withRss: number;
  withTown: number;
  sources: { id: string; label: string; license: string; url: string }[];
  coverageNotes: string[];
};

export type ArticleCandidate = {
  title: string;
  url: string;
  snippet: string;
  isoDate?: string | null;
  source: "rss" | "sitemap" | "search" | "homepage" | "listing";
};

export type MatchResult = {
  matched: boolean;
  species: "bear" | "mountain_lion" | "elk" | "moose" | "other";
  animalTerm?: string;
  attackTerm?: string;
  reason?: string;
};
