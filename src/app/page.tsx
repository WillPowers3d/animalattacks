import { IncidentCard } from "@/components/IncidentCard";
import { IncidentFilters } from "@/components/IncidentFilters";
import { IncidentMap } from "@/components/IncidentMap";
import { parseSearchParams, toWhere } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = parseSearchParams(await searchParams);
  const where = toWhere(sp);

  const [incidents, states, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 80,
    }),
    prisma.incident.findMany({
      where: { stateProvince: { not: null } },
      select: { stateProvince: true },
      distinct: ["stateProvince"],
    }),
    prisma.incident.count({ where }),
  ]);

  const points = incidents
    .filter((i) => i.lat != null && i.lng != null)
    .map((i) => ({
      slug: i.slug,
      title: i.title,
      lat: i.lat as number,
      lng: i.lng as number,
      species: i.species,
      severity: i.severity,
      dateDisplay: i.dateDisplay,
    }));

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
          Browse {total} matching records. The historical core is Dean Weingarten’s documented
          handgun defenses against bears (Ammoland / Gun Watch). Newer rows arrive from news RSS
          and optional Facebook ingest. This is not an official government dataset.
        </p>
      </section>

      <IncidentFilters value={sp} states={stateList} />

      <IncidentMap points={points} />

      <div className="flex items-end justify-between">
        <h3 className="stamp text-[10px] text-kraft-400">Incident list</h3>
        <p className="font-mono text-xs text-moss-300">{total} records · showing {incidents.length}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {incidents.map((inc) => (
          <IncidentCard key={inc.id} incident={inc} />
        ))}
      </div>
      {incidents.length === 0 && (
        <p className="border border-dashed border-kraft-500/30 p-8 text-center text-moss-300">
          No incidents match these filters. Seed the database with{" "}
          <code className="text-kraft-300">npm run db:reset</code>.
        </p>
      )}
    </div>
  );
}
