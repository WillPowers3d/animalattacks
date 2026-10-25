/**
 * Expand the Canadian local-news directory from open sources, then merge
 * with the curated wildlife-priority list (which carries RSS + town coords).
 *
 * Sources (facts only — name / URL / place):
 *  - curated-canada (hand list, RSS + town centers)
 *  - Wikidata newspapers / news websites with P17=Canada (CC0)
 *  - Wikipedia province newspaper-list external links (CC BY-SA)
 *  - palewire/news-homepages rows with country=CA
 */
import fs from "node:fs";
import path from "node:path";
import { isNationalOrJunkHost } from "../src/lib/publications/national";
import { normalizeHost, normalizeHomepage } from "../src/lib/publications/domain";
import { CA_PROVINCE_NAMES, provinceAbbr, WILDLIFE_PROVINCES } from "../src/lib/publications/states";
import { geocodeIncident } from "../src/lib/geo";
import { parseCsv } from "../src/lib/publications/csv";
import type { PublicationSeed } from "../src/lib/publications/types";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "data/publications/canada-local-news.json");
const UA = "animalattacks-tracker/1.0 (https://github.com/WillPowers3d/animalattacks; Canada directory seed)";

type Acc = PublicationSeed & { sources: Set<string> };
const byDomain = new Map<string, Acc>();

function remember(
  raw: {
    name?: string | null;
    url?: string | null;
    city?: string | null;
    town?: string | null;
    state?: string | null;
    lat?: number | null;
    lng?: number | null;
    rssUrl?: string | null;
    wikidataId?: string | null;
    notes?: string | null;
    tier?: PublicationSeed["circulationTier"];
    domain?: string | null;
  },
  source: string,
) {
  const homepageUrl = raw.url ? normalizeHomepage(raw.url) : null;
  const host = raw.domain ?? (homepageUrl ? normalizeHost(homepageUrl) : null);
  if (!host || !homepageUrl) return;
  if (isNationalOrJunkHost(host)) return;
  if (/\.(gov|gc)\.ca$/i.test(host) || host.endsWith(".gc.ca")) return;
  const name = (raw.name ?? host).replace(/\s+/g, " ").trim();
  if (!name || name.length < 2) return;
  const state = provinceAbbr(raw.state) ?? raw.state ?? null;
  const city = raw.city ?? raw.town ?? null;
  const prev = byDomain.get(host);
  if (!prev) {
    byDomain.set(host, {
      name,
      homepageUrl,
      domain: host,
      rssUrl: raw.rssUrl ?? null,
      town: city,
      city,
      state,
      country: "CA",
      lat: raw.lat ?? null,
      lng: raw.lng ?? null,
      circulationTier: raw.tier ?? "newspaper",
      directorySource: source,
      wikidataId: raw.wikidataId ?? null,
      notes: raw.notes ?? null,
      sources: new Set([source]),
    });
    return;
  }
  prev.sources.add(source);
  if (raw.rssUrl && !prev.rssUrl) prev.rssUrl = raw.rssUrl;
  if (city && !prev.city) {
    prev.city = city;
    prev.town = city;
  }
  if (state && !prev.state) prev.state = state;
  if (raw.lat != null && prev.lat == null) {
    prev.lat = raw.lat;
    prev.lng = raw.lng ?? null;
  }
  if (raw.wikidataId && !prev.wikidataId) prev.wikidataId = raw.wikidataId;
  if (name.length > prev.name.length && /[A-Z]/.test(name)) prev.name = name;
}

function loadCurated() {
  if (!fs.existsSync(OUT)) return 0;
  const rows = JSON.parse(fs.readFileSync(OUT, "utf8")) as PublicationSeed[];
  for (const p of rows) {
    remember(
      {
        name: p.name,
        url: p.homepageUrl,
        city: p.city ?? p.town,
        state: p.state,
        lat: p.lat,
        lng: p.lng,
        rssUrl: p.rssUrl,
        notes: p.notes,
        tier: p.circulationTier,
        domain: p.domain,
      },
      p.directorySource || "curated-canada",
    );
  }
  return rows.length;
}

async function loadWikidata() {
  const queries = [
    `SELECT DISTINCT ?item ?itemLabel ?website ?coord ?provLabel ?cityLabel WHERE {
      ?item wdt:P31/wdt:P279* wd:Q11032;
            wdt:P17 wd:Q16;
            wdt:P856 ?website.
      OPTIONAL { ?item wdt:P625 ?coord. }
      OPTIONAL {
        ?item wdt:P131+ ?prov.
        ?prov wdt:P31/wdt:P279* wd:Q11828004.
      }
      OPTIONAL { ?item wdt:P159 ?city. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`,
    `SELECT DISTINCT ?item ?itemLabel ?website ?coord ?provLabel ?cityLabel WHERE {
      ?item wdt:P31/wdt:P279* wd:Q1110794;
            wdt:P17 wd:Q16;
            wdt:P856 ?website.
      OPTIONAL { ?item wdt:P625 ?coord. }
      OPTIONAL {
        ?item wdt:P131+ ?prov.
        ?prov wdt:P31/wdt:P279* wd:Q11828004.
      }
      OPTIONAL { ?item wdt:P159 ?city. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`,
  ];
  let n = 0;
  for (const sparql of queries) {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
      });
      if (!res.ok) {
        console.warn(`  wikidata ${res.status}`);
        continue;
      }
      const json = (await res.json()) as {
        results: { bindings: Record<string, { value: string }>[] };
      };
      for (const b of json.results.bindings) {
        const coord = b.coord?.value;
        let lat: number | null = null;
        let lng: number | null = null;
        const pt = coord?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
        if (pt) {
          lng = Number(pt[1]);
          lat = Number(pt[2]);
        }
        remember(
          {
            name: b.itemLabel?.value,
            url: b.website?.value,
            city: b.cityLabel?.value,
            state: provinceAbbr(b.provLabel?.value),
            lat,
            lng,
            wikidataId: b.item?.value?.split("/").pop(),
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

async function loadWikipediaList() {
  const url =
    "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_newspapers_in_Canada&prop=wikitext&format=json";
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.warn(`  wikipedia list ${res.status}`);
    return;
  }
  const json = (await res.json()) as { parse?: { wikitext?: { "*": string } } };
  const wt = json.parse?.wikitext?.["*"] ?? "";
  const titles: { title: string; city: string | null; state: string | null }[] = [];
  const rowRe =
    /\|\s*''\[\[([^\]|]+)(?:\|[^\]]+)?\]\]''\s*\n\|\s*(?:\[\[(?:[^\|\]]+\|)?([A-Z]{2})\]\]|Nat'l)\s*\n\|\s*(?:\[\[([^\]|]+)(?:\|[^\]]+)?\]\]|([^\n|]+))/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(wt))) {
    const title = m[1].replace(/_/g, " ");
    const state = m[2] && m[2] !== "Na" ? m[2] : null;
    const city = (m[3] ?? m[4] ?? "").replace(/,.*/, "").trim() || null;
    if (state === "Na" || !state) continue;
    titles.push({ title, city, state });
  }
  const localRe =
    /^\*\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*[–—-]\s*''\[\[([^\]|]+)(?:\|[^\]]+)?\]\]''/gm;
  let section = "";
  for (const line of wt.split("\n")) {
    const sec = line.match(/^==+\s*(.+?)\s*==+/);
    if (sec) {
      section = provinceAbbr(sec[1].replace(/\[\[|\]\]/g, "").split("|").pop() ?? "") ?? "";
      continue;
    }
    localRe.lastIndex = 0;
    const hit = localRe.exec(line);
    if (hit && section) {
      titles.push({
        title: hit[2].replace(/_/g, " "),
        city: hit[1].replace(/_/g, " ").replace(/,.*/, ""),
        state: section,
      });
    }
  }
  console.log(`  wikipedia named papers: ${titles.length}`);
  const uniqueTitles = [...new Map(titles.map((t) => [t.title, t])).values()];
  for (let i = 0; i < uniqueTitles.length; i += 40) {
    const slice = uniqueTitles.slice(i, i + 40);
    const q = new URLSearchParams({
      action: "query",
      prop: "pageprops|langlinks",
      ppprop: "wikibase_item",
      lllang: "en",
      titles: slice.map((t) => t.title).join("|"),
      format: "json",
    });
    const qres = await fetch(`https://en.wikipedia.org/w/api.php?${q}`, { headers: { "User-Agent": UA } });
    if (!qres.ok) continue;
    const qjson = (await qres.json()) as {
      query?: { pages?: Record<string, { title: string; pageprops?: { wikibase_item?: string } }> };
    };
    const qids = Object.values(qjson.query?.pages ?? {})
      .map((p) => p.pageprops?.wikibase_item)
      .filter((x): x is string => Boolean(x));
    if (!qids.length) continue;
    const values = qids.map((id) => `wd:${id}`).join(" ");
    const sparql = `SELECT ?item ?itemLabel ?website WHERE {
      VALUES ?item { ${values} }
      OPTIONAL { ?item wdt:P856 ?website. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
    const wres = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`,
      { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } },
    );
    if (!wres.ok) continue;
    const wjson = (await wres.json()) as {
      results: { bindings: Record<string, { value: string }>[] };
    };
    const siteByQid = new Map<string, { name: string; website?: string }>();
    for (const b of wjson.results.bindings) {
      const qid = b.item?.value?.split("/").pop();
      if (qid) siteByQid.set(qid, { name: b.itemLabel?.value, website: b.website?.value });
    }
    const titleToMeta = new Map(slice.map((t) => [t.title, t]));
    for (const page of Object.values(qjson.query?.pages ?? {})) {
      const meta = titleToMeta.get(page.title);
      const qid = page.pageprops?.wikibase_item;
      const site = qid ? siteByQid.get(qid) : undefined;
      if (!meta || !site?.website) continue;
      remember(
        {
          name: site.name ?? page.title,
          url: site.website,
          city: meta.city,
          state: meta.state,
          wikidataId: qid,
        },
        "wikipedia",
      );
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

function inferMissingProvinces() {
  let n = 0;
  for (const pub of byDomain.values()) {
    if (pub.state) continue;
    const blob = `${pub.name} ${pub.domain} ${pub.city ?? ""} ${pub.town ?? ""}`.toLowerCase();
    const hints: [RegExp, string][] = [
      [/\byukon|whitehorse|dawson\b/, "YT"],
      [/\byellowknife|nwt|northwest\b/, "NT"],
      [/\bnunavut|iqaluit|nunatsiaq\b/, "NU"],
      [/\bbc\b|british columbia|vancouver|victoria|kelowna|kamloops|prince george|squamish|whistler|nanaimo|kootenay|revelstoke/, "BC"],
      [/\balberta|calgary|edmonton|banff|canmore|jasper|lethbridge|red deer|grande prairie/, "AB"],
      [/\bsask|saskatoon|regina|moose jaw|prince albert\b/, "SK"],
      [/\bmanitoba|winnipeg|brandon|thompson|flin flon\b/, "MB"],
      [/\bontario|thunder bay|sudbury|timmins|north bay|sault|kenora|algonquin|muskoka\b/, "ON"],
      [/\bquebec|montreal|gatineau\b/, "QC"],
    ];
    for (const [re, abbr] of hints) {
      if (re.test(blob)) {
        pub.state = abbr;
        n += 1;
        break;
      }
    }
  }
  console.log(`  inferred provinces: ${n}`);
}

async function loadNewsHomepages() {
  const url =
    "https://raw.githubusercontent.com/palewire/news-homepages/main/newshomepages/sites.csv";
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.warn(`  news-homepages ${res.status}`);
      return;
    }
    const rows = parseCsv(await res.text());
    let n = 0;
    for (const row of rows) {
      if ((row.country || "").toUpperCase() !== "CA") continue;
      remember(
        {
          name: row.name,
          url: row.url,
          city: row.location,
          state: provinceAbbr(row.location) ?? provinceAbbr(row.bundle),
          tier: "newspaper",
        },
        "news-homepages",
      );
      n += 1;
    }
    console.log(`  news-homepages CA: ${n}`);
  } catch (err) {
    console.warn("  news-homepages error", err);
  }
}

function geocodeMissing() {
  let filled = 0;
  for (const pub of byDomain.values()) {
    if (pub.lat != null && pub.lng != null) continue;
    const geo = geocodeIncident({
      city: pub.city ?? pub.town,
      stateProvince: pub.state,
      country: "CA",
    });
    pub.lat = geo.lat;
    pub.lng = geo.lng;
    filled += 1;
  }
  console.log(`  geocoded ${filled} missing coords`);
}

function finalize(): PublicationSeed[] {
  const rank = (p: Acc) => {
    const i = (WILDLIFE_PROVINCES as readonly string[]).indexOf(p.state ?? "");
    return i === -1 ? 50 : i;
  };
  return [...byDomain.values()]
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .map((p) => ({
      name: p.name,
      homepageUrl: p.homepageUrl,
      domain: p.domain,
      rssUrl: p.rssUrl,
      town: p.town,
      city: p.city,
      state: p.state,
      country: "CA" as const,
      lat: p.lat,
      lng: p.lng,
      circulationTier: p.circulationTier ?? "newspaper",
      directorySource: [...p.sources].sort().join("+"),
      wikidataId: p.wikidataId,
      notes: p.notes,
    }));
}

async function main() {
  const curated = loadCurated();
  console.log(`  curated: ${curated}`);
  await loadWikidata();
  await loadNewsHomepages();
  await loadWikipediaList();
  inferMissingProvinces();
  geocodeMissing();
  const seeds = finalize();
  fs.writeFileSync(OUT, `${JSON.stringify(seeds, null, 2)}\n`);
  const byProv: Record<string, number> = {};
  for (const p of seeds) {
    const k = p.state ?? "??";
    byProv[k] = (byProv[k] ?? 0) + 1;
  }
  console.log(
    JSON.stringify(
      {
        total: seeds.length,
        withRss: seeds.filter((p) => p.rssUrl).length,
        withState: seeds.filter((p) => p.state).length,
        provinces: byProv,
        knownProvinces: Object.keys(CA_PROVINCE_NAMES).length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
