/**
 * Build the committed US local-news publication directory from open sources.
 *
 * Sources (facts: name / URL / town / state — not article text):
 *  - 3DLNews / WM News Lab local-media outlet list (newspapers + local TV/radio)
 *  - sTechLab / ICWSM local-news outlets dataset
 *  - firephil/us-news-sites local domains
 *  - palewire/news-homepages US sites
 *  - Wikidata newspapers & news websites (CC0)
 *  - Wikipedia "List of newspapers in <state>" external links (CC BY-SA)
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseCsv } from "../src/lib/publications/csv";
import { isNationalOrJunkHost } from "../src/lib/publications/national";
import { normalizeHost, normalizeHomepage } from "../src/lib/publications/domain";
import { parseLocationField, stateFromBundle } from "../src/lib/publications/infer-state";
import { stateAbbr, US_STATE_NAMES } from "../src/lib/publications/states";
import { geocodeIncident } from "../src/lib/geo";
import type { CirculationTier, DirectoryManifest, PublicationSeed } from "../src/lib/publications/types";

const ROOT = path.join(import.meta.dirname, "..");
const CACHE = process.env.NEWS_DIR_CACHE || "/tmp/news-dir";
const OUT_DIR = path.join(ROOT, "data/publications");
const UA = "animalattacks-tracker/1.0 (https://github.com/WillPowers3d/animalattacks; directory seed)";

type Acc = PublicationSeed & { sources: Set<string> };

const byDomain = new Map<string, Acc>();
const cityCoords = new Map<string, { lat: number; lng: number; county?: string }>();

function sourceJoin(s: Set<string>) {
  return [...s].sort().join("+");
}

function cleanTown(raw?: string | null): string | null {
  if (!raw) return null;
  const t = raw
    .replace(/\s+(municipality|county|borough|parish|census area|city and borough)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || /^(na|n\/a|unknown|non-us)$/i.test(t)) return null;
  return t;
}

function remember(
  raw: {
    name?: string | null;
    url?: string | null;
    city?: string | null;
    town?: string | null;
    state?: string | null;
    county?: string | null;
    lat?: number | null;
    lng?: number | null;
    rssUrl?: string | null;
    tier?: CirculationTier | string | null;
    wikidataId?: string | null;
    notes?: string | null;
  },
  source: string,
) {
  const host = raw.url ? normalizeHost(raw.url) : null;
  if (!host || isNationalOrJunkHost(host)) return;
  const homepageUrl = normalizeHomepage(raw.url!);
  if (!homepageUrl) return;
  const name = (raw.name ?? host).replace(/\s+/g, " ").trim();
  if (!name || name.length < 2) return;
  const state = stateAbbr(raw.state);
  const city = cleanTown(raw.city);
  const town = cleanTown(raw.town) ?? city;
  const lat = Number.isFinite(raw.lat) ? Number(raw.lat) : null;
  const lng = Number.isFinite(raw.lng) ? Number(raw.lng) : null;

  const prev = byDomain.get(host);
  if (!prev) {
    byDomain.set(host, {
      name,
      homepageUrl,
      domain: host,
      rssUrl: raw.rssUrl || null,
      town,
      city,
      state,
      county: cleanTown(raw.county),
      country: "US",
      lat,
      lng,
      circulationTier: raw.tier ?? "newspaper",
      directorySource: source,
      wikidataId: raw.wikidataId ?? null,
      notes: raw.notes ?? null,
      sources: new Set([source]),
    });
    return;
  }
  prev.sources.add(source);
  if (name.length > prev.name.length && /news|times|herald|tribune|journal|press|gazette|democrat|sentinel|record|sun|star|pilot|enterprise/i.test(name)) {
    prev.name = name;
  }
  if (!prev.rssUrl && raw.rssUrl) prev.rssUrl = raw.rssUrl;
  if (!prev.city && city) prev.city = city;
  if (!prev.town && town) prev.town = town;
  if (!prev.state && state) prev.state = state;
  if (!prev.county && raw.county) prev.county = cleanTown(raw.county);
  if ((prev.lat == null || prev.lng == null) && lat != null && lng != null) {
    prev.lat = lat;
    prev.lng = lng;
  }
  if (!prev.wikidataId && raw.wikidataId) prev.wikidataId = raw.wikidataId;
  const tierRank = (t?: string | null) =>
    t === "newspaper" || t === "weekly" ? 0 : t === "digital" ? 1 : t === "tv" ? 2 : 3;
  if (tierRank(raw.tier) < tierRank(prev.circulationTier)) prev.circulationTier = raw.tier ?? prev.circulationTier;
}

async function download(url: string, dest: string) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return dest;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  console.log(`  downloading ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

function loadCityGazetteer() {
  const p = path.join(CACHE, "us_cities.csv");
  if (!fs.existsSync(p)) return;
  const rows = parseCsv(fs.readFileSync(p, "utf8"));
  for (const row of rows) {
    const state = stateAbbr(row.STATE_CODE || row.STATE_NAME);
    const city = cleanTown(row.CITY);
    const lat = Number(row.LATITUDE);
    const lng = Number(row.LONGITUDE);
    if (!state || !city || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${city.toLowerCase()},${state}`;
    if (!cityCoords.has(key)) cityCoords.set(key, { lat, lng, county: row.COUNTY || undefined });
  }
  console.log(`  city gazetteer: ${cityCoords.size} places`);
}

function load3dl(file: string) {
  const zlibSync = zlib;
  const json = JSON.parse(zlibSync.gunzipSync(fs.readFileSync(file)).toString("utf8")) as Record<
    string,
    Record<string, Record<string, unknown>[]>
  >;
  let n = 0;
  for (const [st, groups] of Object.entries(json)) {
    const state = stateAbbr(st);
    if (!groups || typeof groups !== "object") continue;
    for (const [klass, arr] of Object.entries(groups)) {
      if (!Array.isArray(arr)) continue;
      const tier: CirculationTier =
        klass === "newspaper" ? "newspaper" : klass === "tv" ? "tv" : klass === "radio" ? "radio" : "broadcast";
      for (const o of arr) {
        const rss = Array.isArray(o.rss) ? (o.rss[0] as string | undefined) : undefined;
        remember(
          {
            name: String(o.name ?? ""),
            url: String(o.website ?? ""),
            city: String(o["city-county-name"] ?? ""),
            town: String(o["city-county-name"] ?? ""),
            state,
            lat: typeof o["city-county-lat"] === "number" ? o["city-county-lat"] : Number(o["city-county-lat"]),
            lng: typeof o["city-county-long"] === "number" ? o["city-county-long"] : Number(o["city-county-long"]),
            rssUrl: rss ?? null,
            tier,
          },
          "3dlnews",
        );
        n += 1;
      }
    }
  }
  console.log(`  3DLNews rows processed: ${n}`);
}

function loadStechlab(file: string) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  for (const row of rows) {
    remember(
      {
        name: row.Name,
        url: row.WebsiteUrl,
        city: row.City,
        town: row.City,
        state: row.State,
        county: row.CountyFIPS ? `FIPS ${row.CountyFIPS}` : null,
        tier: /radio|tv|broadcast/i.test(row.FacebookCategories ?? "") ? "broadcast" : "newspaper",
      },
      "stechlab",
    );
  }
  console.log(`  sTechLab rows: ${rows.length}`);
}

function loadFirephil(file: string) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  let n = 0;
  for (const row of rows) {
    const type = (row.type || "").toLowerCase();
    if (type && type !== "local" && type !== "regional") continue;
    remember(
      {
        name: row.domain,
        url: row.domain,
        tier: "newspaper",
      },
      "us-news-sites",
    );
    n += 1;
  }
  console.log(`  firephil local/regional: ${n}`);
}

function loadHomepages(file: string) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  let n = 0;
  for (const row of rows) {
    if ((row.country || "").toUpperCase() !== "US") continue;
    const loc = parseLocationField(row.location);
    remember(
      {
        name: row.name,
        url: row.url,
        city: loc.city,
        town: loc.city,
        state: stateFromBundle(row.bundle) ?? loc.state,
        tier: "newspaper",
      },
      "news-homepages",
    );
    n += 1;
  }
  console.log(`  news-homepages US: ${n}`);
}

async function loadWikidata() {
  const queries = [
    `SELECT DISTINCT ?item ?itemLabel ?website ?coord WHERE {
      ?item wdt:P31/wdt:P279* wd:Q11032;
            wdt:P17 wd:Q30;
            wdt:P856 ?website.
      OPTIONAL { ?item wdt:P625 ?coord. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`,
    `SELECT DISTINCT ?item ?itemLabel ?website ?coord WHERE {
      ?item wdt:P31/wdt:P279* wd:Q2305295;
            wdt:P17 wd:Q30;
            wdt:P856 ?website.
      OPTIONAL { ?item wdt:P625 ?coord. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`,
    `SELECT DISTINCT ?item ?itemLabel ?website ?coord WHERE {
      ?item wdt:P31/wdt:P279* wd:Q17232649;
            wdt:P17 wd:Q30;
            wdt:P856 ?website.
      OPTIONAL { ?item wdt:P625 ?coord. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`,
  ];
  let n = 0;
  for (const sparql of queries) {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
      if (!res.ok) {
        console.warn(`  wikidata ${res.status}`);
        continue;
      }
      const json = (await res.json()) as {
        results: { bindings: Record<string, { value: string }>[] };
      };
      for (const b of json.results.bindings) {
        const website = b.website?.value;
        const label = b.itemLabel?.value;
        const item = b.item?.value;
        const coord = b.coord?.value;
        let lat: number | null = null;
        let lng: number | null = null;
        const pt = coord?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
        if (pt) {
          lng = Number(pt[1]);
          lat = Number(pt[2]);
        }
        const qid = item?.split("/").pop();
        remember(
          {
            name: label,
            url: website,
            lat,
            lng,
            wikidataId: qid,
            tier: "newspaper",
          },
          "wikidata",
        );
        n += 1;
      }
    } catch (err) {
      console.warn("  wikidata error", err);
    }
  }
  console.log(`  wikidata rows: ${n}`);
}

const WIKI_PAGES: [string, string][] = Object.entries(US_STATE_NAMES).map(([abbr, name]) => {
  if (abbr === "DC") return ["List of newspapers in Washington, D.C.", "DC"];
  if (abbr === "GA") return ["List of newspapers in Georgia (U.S. state)", "GA"];
  if (abbr === "WA") return ["List of newspapers in Washington", "WA"];
  if (abbr === "NY") return ["List of newspapers in New York", "NY"];
  if (["PR", "GU", "VI", "AS", "MP"].includes(abbr)) return [`List of newspapers in ${name}`, abbr];
  return [`List of newspapers in ${name}`, abbr];
});

async function loadWikipedia() {
  let n = 0;
  for (const [page, state] of WIKI_PAGES) {
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=externallinks&format=json`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      const json = (await res.json()) as { parse?: { externallinks?: string[] }; error?: { code: string } };
      if (json.error) {
        const alt = page.includes("(U.S. state)")
          ? page.replace(" (U.S. state)", "")
          : `${page} (U.S. state)`;
        const res2 = await fetch(
          `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(alt)}&prop=externallinks&format=json`,
          { headers: { "User-Agent": UA } },
        );
        if (!res2.ok) continue;
        const json2 = (await res2.json()) as { parse?: { externallinks?: string[] } };
        for (const link of json2.parse?.externallinks ?? []) ingestWikiLink(link, state);
        n += json2.parse?.externallinks?.length ?? 0;
        continue;
      }
      for (const link of json.parse?.externallinks ?? []) ingestWikiLink(link, state);
      n += json.parse?.externallinks?.length ?? 0;
      await new Promise((r) => setTimeout(r, 120));
    } catch {
      /* skip page */
    }
  }
  console.log(`  wikipedia externallinks scanned: ${n}`);
}

function ingestWikiLink(link: string, state: string) {
  if (!/^https?:\/\//i.test(link)) return;
  if (/wikipedia\.org|wikimedia|wikidata|archive\.org|web\.archive|facebook\.com|twitter\.com|youtube|instagram|linkedin/i.test(link)) {
    return;
  }
  let host: string | null;
  try {
    host = normalizeHost(link);
  } catch {
    return;
  }
  if (!host) return;
  const nameGuess = host
    .replace(/\.(com|net|org|news|us|co)$/i, "")
    .replace(/^www\./, "")
    .split(".")
    .slice(0, -1)
    .join(" ")
    .replace(/[-_]/g, " ");
  remember(
    {
      name: nameGuess || host,
      url: link,
      state,
      tier: "newspaper",
    },
    "wikipedia",
  );
}

function geocodeMissing() {
  let filled = 0;
  for (const pub of byDomain.values()) {
    if (pub.lat != null && pub.lng != null) continue;
    const city = pub.city || pub.town;
    if (city && pub.state) {
      const hit = cityCoords.get(`${city.toLowerCase()},${pub.state}`);
      if (hit) {
        pub.lat = hit.lat;
        pub.lng = hit.lng;
        if (!pub.county && hit.county) pub.county = hit.county;
        filled += 1;
        continue;
      }
    }
    const geo = geocodeIncident({
      city: city ?? null,
      stateProvince: pub.state ?? null,
      country: "US",
    });
    pub.lat = geo.lat;
    pub.lng = geo.lng;
  }
  console.log(`  gazetteer-filled coords: ${filled}`);
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Fetching / loading open directories…");
  await download(
    "https://raw.githubusercontent.com/wm-newslab/3DLNews/main/resources/usa_2016_2024_pu5e.json.gz",
    path.join(CACHE, "usa_2016_2024_pu5e.json.gz"),
  );
  await download(
    "https://raw.githubusercontent.com/sTechLab/local-news-dataset/main/local_news_outlets_dataset.csv",
    path.join(CACHE, "local_news_outlets_dataset.csv"),
  );
  await download(
    "https://raw.githubusercontent.com/firephil/us-news-sites/main/us-news-domains-v2.0.0.csv",
    path.join(CACHE, "us-news-domains-v2.0.0.csv"),
  );
  await download(
    "https://raw.githubusercontent.com/palewire/news-homepages/main/newshomepages/sources/sites.csv",
    path.join(CACHE, "news-homepages-sites.csv"),
  );
  await download(
    "https://raw.githubusercontent.com/kelvins/US-Cities-Database/main/csv/us_cities.csv",
    path.join(CACHE, "us_cities.csv"),
  );

  loadCityGazetteer();
  load3dl(path.join(CACHE, "usa_2016_2024_pu5e.json.gz"));
  loadStechlab(path.join(CACHE, "local_news_outlets_dataset.csv"));
  loadFirephil(path.join(CACHE, "us-news-domains-v2.0.0.csv"));
  loadHomepages(path.join(CACHE, "news-homepages-sites.csv"));
  await loadWikidata();
  await loadWikipedia();
  geocodeMissing();

  const publications: PublicationSeed[] = [...byDomain.values()]
    .map((p) => ({
      name: p.name,
      homepageUrl: p.homepageUrl,
      domain: p.domain,
      rssUrl: p.rssUrl ?? null,
      town: p.town ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      county: p.county ?? null,
      country: "US" as const,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      circulationTier: p.circulationTier ?? "newspaper",
      directorySource: sourceJoin(p.sources),
      wikidataId: p.wikidataId ?? null,
      notes: p.notes ?? null,
    }))
    .sort((a, b) => (a.state ?? "ZZ").localeCompare(b.state ?? "ZZ") || a.name.localeCompare(b.name));

  const byState: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let withCoords = 0;
  let withRss = 0;
  let withTown = 0;
  for (const p of publications) {
    byState[p.state ?? "??"] = (byState[p.state ?? "??"] ?? 0) + 1;
    const tier = p.circulationTier ?? "other";
    byTier[tier] = (byTier[tier] ?? 0) + 1;
    for (const s of (p.directorySource ?? "").split("+")) {
      if (s) bySource[s] = (bySource[s] ?? 0) + 1;
    }
    if (p.lat != null && p.lng != null) withCoords += 1;
    if (p.rssUrl) withRss += 1;
    if (p.town || p.city) withTown += 1;
  }

  const manifest: DirectoryManifest = {
    generatedAt: new Date().toISOString(),
    publicationCount: publications.length,
    uniqueDomains: publications.length,
    byState,
    byTier,
    bySource,
    withCoords,
    withRss,
    withTown,
    sources: [
      {
        id: "3dlnews",
        label: "3DLNews / WM News Lab US local media outlets (newspapers, TV, radio)",
        license: "Academic compilation of public directory facts (usnpl / thepaperboy / 50states). Name, URL, town, coordinates only.",
        url: "https://github.com/wm-newslab/3DLNews",
      },
      {
        id: "stechlab",
        label: "sTechLab / ICWSM 2022 local news outlets dataset (~10k)",
        license: "Research dataset; we store name / website / city / state only and cite the paper.",
        url: "https://github.com/sTechLab/local-news-dataset",
      },
      {
        id: "us-news-sites",
        label: "firephil/us-news-sites local & regional domains",
        license: "Public domain list of news domains.",
        url: "https://github.com/firephil/us-news-sites",
      },
      {
        id: "news-homepages",
        label: "palewire/news-homepages US site roster",
        license: "GPL-3.0 project; factual site names/URLs used as directory entries.",
        url: "https://github.com/palewire/news-homepages",
      },
      {
        id: "wikidata",
        label: "Wikidata newspapers / weekly newspapers / news websites (P17=US, P856 website)",
        license: "CC0",
        url: "https://query.wikidata.org/",
      },
      {
        id: "wikipedia",
        label: "Wikipedia lists of newspapers by US state (external links)",
        license: "CC BY-SA 4.0 — attribute Wikipedia / contributors",
        url: "https://en.wikipedia.org/wiki/List_of_newspapers_in_the_United_States",
      },
    ],
    coverageNotes: [
      "This is an expandable starter directory, not a complete census of every US town paper.",
      "Many weeklies have died, moved, or lost websites since the source snapshots (2016–2024).",
      "National wires and platforms are filtered; metro dailies are kept because they still cover nearby towns.",
      "TV/radio news sites are included (marked circulationTier) but the crawler defaults to newspapers/weeklies/digital.",
      "Town-center coordinates come from the source dataset, a US cities gazetteer, or state centroids as last resort.",
      "Expand by re-running npm run publications:build, then adding rows to data/publications/extra.json.",
    ],
  };

  const jsonPath = path.join(OUT_DIR, "us-local-news.json");
  const gzPath = path.join(OUT_DIR, "us-local-news.json.gz");
  const manifestPath = path.join(OUT_DIR, "manifest.json");
  fs.writeFileSync(jsonPath, JSON.stringify(publications));
  fs.writeFileSync(gzPath, zlib.gzipSync(fs.readFileSync(jsonPath)));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.unlinkSync(jsonPath);

  console.log(`Wrote ${publications.length} publications -> ${gzPath}`);
  console.log(`  with coords=${withCoords} rss=${withRss} town=${withTown}`);
  console.log(`  tiers`, byTier);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
