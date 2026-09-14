import { HomeExplorer } from "@/components/HomeExplorer";
import { LatestAttacks } from "@/components/LatestAttacks";
import { toExplorerIncident } from "@/lib/explorer";
import { parseSearchParams, toWhere } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = parseSearchParams(await searchParams);
  const where = toWhere({ ...sp, species: undefined, hide: undefined, country: undefined });

  const [rows, states, total, lastIngest, coverage] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.incident.findMany({
      where: { stateProvince: { not: null } },
      select: { stateProvince: true },
      distinct: ["stateProvince"],
    }),
    prisma.incident.count({ where }),
    prisma.ingestRun.findFirst({
      where: { dryRun: false },
      orderBy: { startedAt: "desc" },
    }),
    prisma.incident.groupBy({ by: ["country"], _count: { _all: true } }),
  ]);

  const incidents = rows.map(toExplorerIncident);
  const latest = incidents.slice(0, 8);

  const stateList = states
    .map((s) => s.stateProvince)
    .filter((s): s is string => Boolean(s))
    .sort();

  return (
    <div className="space-y-6">
      <section className="field-grid border border-kraft-500/25 bg-moss-900/40 p-5">
        <p className="stamp text-[10px] text-rust-400">Open field ledger</p>
        <h2 className="mt-1 font-display text-3xl text-kraft-200 sm:text-4xl">
          North American animal attacks
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-moss-200">
          {total} records in the ledger — every geocoded attack is on the map. Toggle US / Canada /
          All on the map, then tap a cluster. Historical core: Dean Weingarten’s documented handgun
          defenses against bears (Ammoland / Gun Watch). This is not official government data.
        </p>
        <p className="mt-3 border border-kraft-500/30 bg-moss-950/70 px-3 py-2 font-mono text-[11px] text-kraft-200">
          Coverage: {coverage.find((c) => c.country === "US")?._count._all ?? 0} US ·{" "}
          {coverage.find((c) => c.country === "CA")?._count._all ?? 0} Canada · {total} in this
          view.{" "}
          <a href="/data" className="text-kraft-300 underline decoration-kraft-500/40">
            Live crawl stats →
          </a>
        </p>
        {lastIngest ? (
          <p className="mt-3 font-mono text-[11px] text-moss-300">
            Last live ingest {lastIngest.finishedAt?.toISOString().slice(0, 16) ?? "running"} UTC ·
            fetched {lastIngest.fetched} · wrote {lastIngest.upserted} · skipped {lastIngest.skipped}
            {lastIngest.errors ? " · see /api/ingest/status for warnings" : ""}
          </p>
        ) : (
          <p className="mt-3 font-mono text-[11px] text-moss-400">
            No live ingest run yet — seed data is loaded. Daily updates use GitHub Actions or Vercel
            Cron against Postgres.
          </p>
        )}
      </section>

      <LatestAttacks incidents={latest} />

      <HomeExplorer incidents={incidents} query={sp} states={stateList} />
    </div>
  );
}
