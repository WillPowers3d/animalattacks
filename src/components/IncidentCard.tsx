import Link from "next/link";
import { formatLocation } from "@/lib/incident-utils";
import { SEVERITY_LABELS, SPECIES_LABELS, type Severity, type Species } from "@/lib/types";

export type IncidentCardData = {
  slug: string;
  title: string;
  species: string;
  subspecies?: string | null;
  dateDisplay?: string | null;
  occurredAt?: Date | string | null;
  city?: string | null;
  region?: string | null;
  stateProvince?: string | null;
  country: string;
  severity: string;
  caliber?: string | null;
  firearmType?: string | null;
  defenseOutcome?: string | null;
  sourceType: string;
  verified: boolean;
  summary: string;
};

const severityTone: Record<string, string> = {
  fatal: "border-rust-500 text-rust-400",
  injury: "border-ochre text-ochre",
  near_miss: "border-kraft-400 text-kraft-300",
  property: "border-moss-400 text-moss-200",
};

export function IncidentCard({ incident }: { incident: IncidentCardData }) {
  const date =
    incident.dateDisplay ||
    (incident.occurredAt
      ? new Date(incident.occurredAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Undated");

  return (
    <article className="border border-kraft-500/20 bg-moss-900/60 p-4 hover:border-kraft-400/50">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
        <span className={`border px-1.5 py-0.5 ${severityTone[incident.severity] ?? "border-moss-400"}`}>
          {SEVERITY_LABELS[incident.severity as Severity] ?? incident.severity}
        </span>
        <span className="text-kraft-400">
          {SPECIES_LABELS[incident.species as Species] ?? incident.species}
          {incident.subspecies ? ` · ${incident.subspecies}` : ""}
        </span>
        {incident.verified && (
          <span className="border border-moss-400/50 px-1.5 py-0.5 text-moss-200">Logged source</span>
        )}
      </div>
      <h3 className="font-display text-lg leading-snug text-kraft-200">
        <Link href={`/incidents/${incident.slug}`} className="hover:text-white">
          {incident.title}
        </Link>
      </h3>
      <p className="mt-1 font-mono text-xs text-moss-300">
        {date} · {formatLocation(incident)} · {incident.sourceType}
        {incident.caliber ? ` · ${incident.caliber}` : ""}
        {incident.defenseOutcome ? ` · defense ${incident.defenseOutcome}` : ""}
      </p>
      <p className="mt-2 line-clamp-3 text-sm text-moss-200">{incident.summary}</p>
    </article>
  );
}
