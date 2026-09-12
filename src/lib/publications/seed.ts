import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { prisma } from "../prisma";
import type { PublicationSeed } from "./types";

function rootDir() {
  return path.join(import.meta.dirname, "..", "..", "..");
}

export function loadPublicationSeeds(): PublicationSeed[] {
  const dir = path.join(rootDir(), "data/publications");
  const gz = path.join(dir, "us-local-news.json.gz");
  const extras = [
    "extra.json",
    "canada-local-news.json",
    "agency-feeds.json",
  ];
  let main: PublicationSeed[] = [];
  if (fs.existsSync(gz)) {
    main = JSON.parse(zlib.gunzipSync(fs.readFileSync(gz)).toString("utf8")) as PublicationSeed[];
  }
  const more: PublicationSeed[] = [];
  for (const name of extras) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      more.push(...(JSON.parse(fs.readFileSync(p, "utf8")) as PublicationSeed[]));
    }
  }
  const byDomain = new Map<string, PublicationSeed>();
  for (const p of [...main, ...more]) {
    if (p.domain) byDomain.set(p.domain, p);
  }
  return [...byDomain.values()];
}

export async function seedPublications(opts: { log?: boolean } = {}) {
  const pubs = loadPublicationSeeds();
  if (opts.log) console.log(`Seeding ${pubs.length} publications…`);
  let n = 0;
  const chunk = 100;
  for (let i = 0; i < pubs.length; i += chunk) {
    const slice = pubs.slice(i, i + chunk);
    await prisma.$transaction(
      slice.map((p) =>
        prisma.publication.upsert({
          where: { domain: p.domain },
          create: {
            name: p.name,
            homepageUrl: p.homepageUrl,
            domain: p.domain,
            rssUrl: p.rssUrl ?? null,
            sitemapUrl: p.sitemapUrl ?? null,
            town: p.town ?? p.city ?? null,
            city: p.city ?? p.town ?? null,
            state: p.state ?? null,
            county: p.county ?? null,
            country: p.country ?? "US",
            lat: p.lat ?? null,
            lng: p.lng ?? null,
            circulationTier: p.circulationTier ?? null,
            directorySource: p.directorySource,
            wikidataId: p.wikidataId ?? null,
            notes: p.notes ?? null,
            enabled: true,
          },
          update: {
            name: p.name,
            homepageUrl: p.homepageUrl,
            rssUrl: p.rssUrl ?? undefined,
            town: p.town ?? p.city ?? undefined,
            city: p.city ?? p.town ?? undefined,
            state: p.state ?? undefined,
            county: p.county ?? undefined,
            country: p.country ?? undefined,
            lat: p.lat ?? undefined,
            lng: p.lng ?? undefined,
            circulationTier: p.circulationTier ?? undefined,
            directorySource: p.directorySource,
            wikidataId: p.wikidataId ?? undefined,
            notes: p.notes ?? undefined,
          },
        }),
      ),
    );
    n += slice.length;
    if (opts.log && n % 1000 === 0) console.log(`  publications ${n}/${pubs.length}`);
  }
  if (opts.log) console.log(`Seeded ${n} publications.`);
  return n;
}
