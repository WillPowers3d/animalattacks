/**
 * Infer missing Publication.state from a US city gazetteer and already-stated peers.
 * Updates the live DB and, if --rewrite-seed, the committed gzip directory.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseCsv } from "../src/lib/publications/csv";
import { stateAbbr } from "../src/lib/publications/states";
import { prisma } from "../src/lib/prisma";
import type { PublicationSeed } from "../src/lib/publications/types";

const CACHE = process.env.NEWS_DIR_CACHE || "/tmp/news-dir";
const rewriteSeed = process.argv.includes("--rewrite-seed");

function cleanTown(raw?: string | null): string | null {
  if (!raw) return null;
  const t = raw.replace(/\s+(municipality|county|borough|parish|census area)$/i, "").trim();
  return t || null;
}

async function main() {
  const cityFile = path.join(CACHE, "us_cities.csv");
  const cityToStates = new Map<string, Set<string>>();
  if (fs.existsSync(cityFile)) {
    for (const row of parseCsv(fs.readFileSync(cityFile, "utf8"))) {
      const city = cleanTown(row.CITY)?.toLowerCase();
      const st = stateAbbr(row.STATE_CODE);
      if (!city || !st) continue;
      const set = cityToStates.get(city) ?? new Set();
      set.add(st);
      cityToStates.set(city, set);
    }
  }

  const peers = await prisma.publication.findMany({
    where: { state: { not: null }, OR: [{ city: { not: null } }, { town: { not: null } }] },
    select: { city: true, town: true, state: true },
  });
  const peerMap = new Map<string, Set<string>>();
  for (const p of peers) {
    const city = cleanTown(p.city || p.town)?.toLowerCase();
    if (!city || !p.state) continue;
    const set = peerMap.get(city) ?? new Set();
    set.add(p.state);
    peerMap.set(city, set);
  }

  const missing = await prisma.publication.findMany({
    where: { OR: [{ state: null }, { state: "" }] },
    select: { id: true, domain: true, city: true, town: true },
  });

  let filled = 0;
  const updates: { domain: string; state: string }[] = [];
  for (const pub of missing) {
    const city = cleanTown(pub.city || pub.town)?.toLowerCase();
    if (!city) continue;
    const fromGazetteer = cityToStates.get(city);
    const fromPeers = peerMap.get(city);
    let state: string | null = null;
    if (fromGazetteer && fromGazetteer.size === 1) state = [...fromGazetteer][0];
    else if (fromPeers && fromPeers.size === 1) state = [...fromPeers][0];
    else if (fromGazetteer && fromPeers) {
      const overlap = [...fromGazetteer].filter((s) => fromPeers.has(s));
      if (overlap.length === 1) state = overlap[0];
    }
    if (!state) continue;
    await prisma.publication.update({ where: { id: pub.id }, data: { state } });
    updates.push({ domain: pub.domain, state });
    filled += 1;
  }

  console.log(`Filled state on ${filled}/${missing.length} publications missing a state.`);

  if (rewriteSeed && updates.length) {
    const gz = path.join(process.cwd(), "data/publications/us-local-news.json.gz");
    const pubs = JSON.parse(zlib.gunzipSync(fs.readFileSync(gz)).toString("utf8")) as PublicationSeed[];
    const byDomain = new Map(updates.map((u) => [u.domain, u.state]));
    let n = 0;
    for (const p of pubs) {
      if (!p.state && byDomain.has(p.domain)) {
        p.state = byDomain.get(p.domain) ?? null;
        n += 1;
      }
    }
    fs.writeFileSync(gz, zlib.gzipSync(Buffer.from(JSON.stringify(pubs))));
    console.log(`Rewrote seed gzip with ${n} newly stated rows.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
