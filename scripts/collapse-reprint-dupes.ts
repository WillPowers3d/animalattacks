/**
 * Collapse reprint-farm clones already stored as separate incidents.
 * Keeps the best dossier, moves extra URLs onto it, deletes the rest.
 */
import { prisma } from "../src/lib/prisma";
import { clusterEvents, extractPlaces, type EventFields } from "../src/lib/publications/event-dedupe";

type Row = EventFields & {
  id: string;
  slug: string;
  verified: boolean;
  createdAt: Date;
  publicationId: string | null;
  sourceCount: number;
};

function keeperScore(row: Row): number {
  let n = 0;
  if (row.sourceType === "ammoland") n += 100;
  if (row.verified) n += 40;
  if (row.sourceType === "agency") n += 20;
  if (row.occurredAt) n += 15;
  const places = extractPlaces(row.title, row.city);
  if (places.length && row.city && places.some((p) => row.title.toLowerCase().includes(p.split(" ")[0]))) n += 12;
  n += Math.min(10, row.sourceCount);
  n -= row.createdAt.getTime() / 1e15;
  return n;
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const rows = await prisma.incident.findMany({
    where: { sourceType: { not: "ammoland" } },
    include: { sources: { select: { url: true } } },
  });
  const mapped: Row[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    occurredAt: r.occurredAt,
    city: r.city,
    stateProvince: r.stateProvince,
    country: r.country,
    species: r.species,
    sourceType: r.sourceType,
    urls: r.sources.map((s) => s.url),
    verified: r.verified,
    createdAt: r.createdAt,
    publicationId: r.publicationId,
    sourceCount: r.sources.length,
  }));

  const before = mapped.length;
  const clusters = clusterEvents(mapped);
  let mergedClusters = 0;
  let removed = 0;
  const samples: string[] = [];

  for (const group of clusters) {
    if (group.length < 2) continue;
    mergedClusters += 1;
    const ranked = [...group].sort((a, b) => keeperScore(b) - keeperScore(a));
    const keep = ranked[0];
    const drop = ranked.slice(1);
    samples.push(
      `KEEP ${keep.title.slice(0, 90)} ← ${drop.length} clones (${drop.map((d) => d.title.slice(0, 40)).join(" | ")})`,
    );
    if (dry) {
      removed += drop.length;
      continue;
    }
    for (const extra of drop) {
      const extraRow = await prisma.incident.findUnique({
        where: { id: extra.id },
        include: { sources: true },
      });
      if (!extraRow) continue;
      for (const s of extraRow.sources) {
        const exists = await prisma.source.findFirst({
          where: { incidentId: keep.id, url: s.url },
        });
        if (!exists) {
          await prisma.source.create({
            data: {
              incidentId: keep.id,
              url: s.url,
              title: s.title,
              publisher: s.publisher,
            },
          });
        }
      }
      await prisma.incident.delete({ where: { id: extra.id } });
      removed += 1;
    }
  }

  const after = before - removed;
  const report = {
    dryRun: dry,
    before,
    after,
    removed,
    mergedClusters,
    samples: samples.slice(0, 40),
  };
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
