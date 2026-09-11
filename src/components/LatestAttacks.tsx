import { IncidentCard } from "@/components/IncidentCard";
import type { ExplorerIncident } from "@/lib/explorer";

export function LatestAttacks({ incidents }: { incidents: ExplorerIncident[] }) {
  if (!incidents.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="stamp text-[10px] text-rust-400">Latest attacks</p>
          <h3 className="font-display text-2xl text-kraft-200">Most recent by date</h3>
        </div>
        <p className="font-mono text-xs text-moss-300">{incidents.length} newest in this view</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {incidents.map((inc) => (
          <IncidentCard key={`latest-${inc.slug}`} incident={inc} />
        ))}
      </div>
    </section>
  );
}
