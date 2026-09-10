import { HomeExplorer } from "@/components/HomeExplorer";
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
  const where = toWhere({ ...sp, species: undefined, hide: undefined });

  const [rows, states, total] = await Promise.all([
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
  ]);

  const incidents = rows.map(toExplorerIncident).filter((i): i is NonNullable<typeof i> => i != null);

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
          {total} records in the ledger — every geocoded attack is on the map. Toggle animals live;
          tap a cluster to expand, then a colored mark for the dossier. Historical core: Dean
          Weingarten’s documented handgun defenses against bears (Ammoland / Gun Watch). This is
          not official government data.
        </p>
      </section>

      <HomeExplorer incidents={incidents} query={sp} states={stateList} />
    </div>
  );
}
