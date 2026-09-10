import { CaliberChart, RegionChart, SpeciesChart, TrendChart } from "@/components/StatsCharts";
import { prisma } from "@/lib/prisma";
import { SPECIES_LABELS, type Species } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Statistics" };

export default async function StatsPage() {
  const incidents = await prisma.incident.findMany({
    select: {
      species: true,
      stateProvince: true,
      country: true,
      occurredAt: true,
      caliber: true,
      defenseOutcome: true,
      firearmType: true,
      combinationDefense: true,
    },
  });

  const bySpecies = Object.entries(
    incidents.reduce<Record<string, number>>((acc, i) => {
      acc[i.species] = (acc[i.species] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, count]) => ({
      name: SPECIES_LABELS[name as Species] ?? name,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const byRegion = Object.entries(
    incidents.reduce<Record<string, number>>((acc, i) => {
      const key = i.stateProvince || i.country;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const byYear = Object.entries(
    incidents.reduce<Record<string, number>>((acc, i) => {
      if (!i.occurredAt) return acc;
      const y = String(i.occurredAt.getUTCFullYear());
      acc[y] = (acc[y] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const gunCases = incidents.filter((i) => i.firearmType === "handgun" && i.caliber);
  const caliberMap = new Map<string, { success: number; failure: number; indeterminate: number }>();
  for (const i of gunCases) {
    const key = i.caliber ?? "Unknown";
    const row = caliberMap.get(key) ?? { success: 0, failure: 0, indeterminate: 0 };
    if (i.defenseOutcome === "failure") row.failure += 1;
    else if (i.defenseOutcome === "indeterminate") row.indeterminate += 1;
    else row.success += 1;
    caliberMap.set(key, row);
  }
  const caliberData = [...caliberMap.entries()]
    .map(([caliber, v]) => ({ caliber, ...v, total: v.success + v.failure + v.indeterminate }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const handgunOnly = incidents.filter((i) => i.firearmType === "handgun" && !i.combinationDefense);
  const successes = handgunOnly.filter((i) => i.defenseOutcome === "success").length;
  const failures = handgunOnly.filter((i) => i.defenseOutcome === "failure").length;
  const judged = successes + failures;
  const rate = judged ? Math.round((successes / judged) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <section>
        <p className="stamp text-[10px] text-rust-400">Compiled observations</p>
        <h1 className="font-display text-3xl text-kraft-200">Statistics</h1>
        <p className="mt-2 max-w-3xl text-sm text-moss-200">
          Counts reflect this site’s seeded Weingarten/Ammoland corpus plus extra public incidents
          and any ingested news. Effectiveness math follows Weingarten’s published rule: handgun
          fired, combination cases excluded, success = bear stopped, left, or killed.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat tile="Records" value={String(incidents.length)} />
        <Stat tile="Handgun-only judged" value={`${judged}`} note={`${successes} success / ${failures} failure`} />
        <Stat tile="Handgun success (this DB)" value={`${rate}%`} note="Not a clinical trial" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpeciesChart data={bySpecies} />
        <RegionChart data={byRegion} />
        <TrendChart data={byYear} />
        <CaliberChart data={caliberData} />
      </div>
    </div>
  );
}

function Stat({ tile, value, note }: { tile: string; value: string; note?: string }) {
  return (
    <div className="border border-kraft-500/25 bg-moss-900/50 p-4">
      <p className="stamp text-[10px] text-moss-300">{tile}</p>
      <p className="font-display text-3xl text-kraft-200">{value}</p>
      {note && <p className="text-xs text-moss-300">{note}</p>}
    </div>
  );
}
