/**
 * Infer missing Publication.state from gazetteer, news-homepages bundles,
 * unique city names, and domain tokens. Updates the live DB (unless --seed-only)
 * and, if --rewrite-seed, the committed gzip directory + manifest.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseCsv } from "../src/lib/publications/csv";
import { geocodeIncident } from "../src/lib/geo";
import {
  buildUniqueCityIndex,
  isUsCentroid,
  parseLocationField,
  stateFromBundle,
  stateFromCityName,
  stateFromDomain,
  type UniqueCityIndex,
} from "../src/lib/publications/infer-state";
import { stateAbbr, US_STATE_NAMES } from "../src/lib/publications/states";
import { prisma } from "../src/lib/prisma";
import { withBusyRetry } from "../src/lib/publications/http";
import type { DirectoryManifest, PublicationSeed } from "../src/lib/publications/types";

const CACHE = process.env.NEWS_DIR_CACHE || "/tmp/news-dir";
const rewriteSeed = process.argv.includes("--rewrite-seed");
const seedOnly = process.argv.includes("--seed-only");

function loadUniqueCities(): UniqueCityIndex {
  const cityFile = path.join(CACHE, "us_cities.csv");
  const rows: { city: string; state: string }[] = [];
  if (fs.existsSync(cityFile)) {
    for (const row of parseCsv(fs.readFileSync(cityFile, "utf8"))) {
      if (row.CITY && (row.STATE_CODE || row.STATE_NAME)) {
        rows.push({ city: row.CITY, state: row.STATE_CODE || row.STATE_NAME });
      }
    }
  }
  return buildUniqueCityIndex(rows);
}

function loadHomepageHints(): Map<string, { state: string | null; city: string | null }> {
  const file = path.join(CACHE, "news-homepages-sites.csv");
  const out = new Map<string, { state: string | null; city: string | null }>();
  if (!fs.existsSync(file)) return out;
  for (const row of parseCsv(fs.readFileSync(file, "utf8"))) {
    if ((row.country || "").toUpperCase() !== "US") continue;
    let host = "";
    try {
      host = new URL(row.url.startsWith("http") ? row.url : `https://${row.url}`).hostname
        .toLowerCase()
        .replace(/^www\./, "");
    } catch {
      continue;
    }
    const loc = parseLocationField(row.location);
    const fromBundle = stateFromBundle(row.bundle);
    out.set(host, { state: fromBundle ?? loc.state, city: loc.city });
  }
  return out;
}

function inferOne(
  pub: { domain: string; city?: string | null; town?: string | null; name?: string | null },
  unique: UniqueCityIndex,
  peers: UniqueCityIndex,
  homepage: Map<string, { state: string | null; city: string | null }>,
): { state: string; city?: string } | null {
  const hint = homepage.get(pub.domain.toLowerCase().replace(/^www\./, ""));
  const city = pub.city || pub.town || hint?.city || null;
  const state =
    hint?.state ||
    stateFromCityName(city, unique) ||
    stateFromCityName(city, peers) ||
    stateFromDomain(pub.domain, unique) ||
    stateFromDomain(pub.name ?? "", unique);
  if (!state) return null;
  return { state, city: city ?? undefined };
}

function rewriteManifest(pubs: PublicationSeed[]) {
  const manifestPath = path.join(process.cwd(), "data/publications/manifest.json");
  const prev = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as DirectoryManifest;
  const byState: Record<string, number> = {};
  let withTown = 0;
  let withCoords = 0;
  let withRss = 0;
  for (const p of pubs) {
    byState[p.state ?? "??"] = (byState[p.state ?? "??"] ?? 0) + 1;
    if (p.town || p.city) withTown += 1;
    if (p.lat != null && p.lng != null) withCoords += 1;
    if (p.rssUrl) withRss += 1;
  }
  const next: DirectoryManifest = {
    ...prev,
    generatedAt: new Date().toISOString(),
    publicationCount: pubs.length,
    uniqueDomains: pubs.length,
    byState,
    withTown,
    withCoords,
    withRss,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2));
}

async function main() {
  const unique = loadUniqueCities();
  const homepage = loadHomepageHints();
  console.log(`Unique gazetteer cities: ${unique.size}; homepage hints: ${homepage.size}`);

  const peerMap = new Map<string, Set<string>>();
  if (!seedOnly) {
    const peers = await prisma.publication.findMany({
      where: { state: { not: null }, OR: [{ city: { not: null } }, { town: { not: null } }] },
      select: { city: true, town: true, state: true },
    });
    for (const p of peers) {
      const city = (p.city || p.town || "").trim().toLowerCase();
      if (!city || !p.state) continue;
      const set = peerMap.get(city) ?? new Set();
      set.add(p.state);
      peerMap.set(city, set);
    }
  }
  const peerUnique: UniqueCityIndex = new Map();
  for (const [city, states] of peerMap) {
    if (states.size === 1) peerUnique.set(city, [...states][0]);
  }

  const updates: { domain: string; state: string; city?: string; lat?: number; lng?: number }[] = [];

  if (!seedOnly) {
    const missing = await prisma.publication.findMany({
      where: { OR: [{ state: null }, { state: "" }] },
      select: { id: true, domain: true, city: true, town: true, name: true, lat: true, lng: true },
    });
    let filled = 0;
    for (const pub of missing) {
      const hit = inferOne(pub, unique, peerUnique, homepage);
      if (!hit) continue;
      const geo = geocodeIncident({
        city: hit.city ?? pub.city ?? pub.town ?? null,
        stateProvince: hit.state,
        country: "US",
      });
      const useGeo = isUsCentroid(pub.lat, pub.lng) || pub.lat == null;
      await withBusyRetry(() =>
        prisma.publication.update({
          where: { id: pub.id },
          data: {
            state: hit.state,
            city: hit.city ?? undefined,
            town: pub.town ?? hit.city ?? undefined,
            lat: useGeo ? geo.lat : undefined,
            lng: useGeo ? geo.lng : undefined,
          },
        }),
      );
      updates.push({
        domain: pub.domain,
        state: hit.state,
        city: hit.city,
        lat: useGeo ? geo.lat : undefined,
        lng: useGeo ? geo.lng : undefined,
      });
      filled += 1;
    }
    console.log(`Filled state on ${filled}/${missing.length} live publications missing a state.`);
  }

  if (rewriteSeed) {
    const gz = path.join(process.cwd(), "data/publications/us-local-news.json.gz");
    const pubs = JSON.parse(zlib.gunzipSync(fs.readFileSync(gz)).toString("utf8")) as PublicationSeed[];
    const byDomain = new Map(updates.map((u) => [u.domain, u]));
    let n = 0;
    for (const p of pubs) {
      if (p.state) continue;
      const hit = byDomain.get(p.domain) ?? inferOne(p, unique, peerUnique, homepage);
      if (!hit) continue;
      p.state = hit.state;
      if (hit.city && !p.city) p.city = hit.city;
      if (isUsCentroid(p.lat, p.lng) || p.lat == null) {
        const geo = geocodeIncident({
          city: p.city ?? p.town ?? hit.city ?? null,
          stateProvince: p.state,
          country: "US",
        });
        p.lat = geo.lat;
        p.lng = geo.lng;
      }
      n += 1;
    }
    fs.writeFileSync(gz, zlib.gzipSync(Buffer.from(JSON.stringify(pubs))));
    rewriteManifest(pubs);
    const still = pubs.filter((p) => !p.state).length;
    console.log(`Rewrote seed gzip with ${n} newly stated rows; ${still} still missing a state.`);
  }

  if (!seedOnly) await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
