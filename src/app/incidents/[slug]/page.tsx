import Link from "next/link";
import { notFound } from "next/navigation";
import { IncidentMap } from "@/components/IncidentMap";
import { formatLocation } from "@/lib/incident-utils";
import { prisma } from "@/lib/prisma";
import {
  FIREARM_LABELS,
  OUTCOME_LABELS,
  SEVERITY_LABELS,
  SPECIES_LABELS,
  type DefenseOutcome,
  type FirearmType,
  type Severity,
  type Species,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inc = await prisma.incident.findUnique({ where: { slug } });
  return { title: inc?.title ?? "Incident" };
}

export default async function IncidentDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inc = await prisma.incident.findUnique({
    where: { slug },
    include: { sources: true },
  });
  if (!inc) notFound();

  const related = await prisma.incident.findMany({
    where: {
      id: { not: inc.id },
      OR: [{ species: inc.species }, { stateProvince: inc.stateProvince ?? undefined }],
    },
    take: 4,
    orderBy: { occurredAt: "desc" },
  });

  return (
    <article className="space-y-6">
      <Link href="/" className="font-mono text-xs uppercase tracking-wider text-kraft-400 hover:text-kraft-200">
        ← Back to map
      </Link>
      <header className="border border-kraft-500/25 bg-moss-900/50 p-5">
        <p className="stamp text-[10px] text-rust-400">Incident dossier</p>
        <h1 className="mt-1 font-display text-3xl text-kraft-200">{inc.title}</h1>
        <p className="mt-2 font-mono text-sm text-moss-300">
          {inc.dateDisplay ?? "Undated"} · {formatLocation(inc)} ·{" "}
          {SPECIES_LABELS[inc.species as Species] ?? inc.species}
          {inc.subspecies ? ` (${inc.subspecies})` : ""}
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Severity" value={SEVERITY_LABELS[inc.severity as Severity] ?? inc.severity} />
        <Fact label="Source type" value={inc.sourceType} />
        <Fact label="Verified flag" value={inc.verified ? "Logged source" : "Unverified ingest"} />
        <Fact
          label="Firearm"
          value={
            inc.firearmType
              ? `${FIREARM_LABELS[inc.firearmType as FirearmType] ?? inc.firearmType}${inc.caliber ? ` · ${inc.caliber}` : ""}`
              : "None / not recorded"
          }
        />
        <Fact label="Shots fired" value={inc.shotsFired != null ? String(inc.shotsFired) : "Unknown"} />
        <Fact
          label="Defense outcome"
          value={inc.defenseOutcome ? OUTCOME_LABELS[inc.defenseOutcome as DefenseOutcome] : "n/a"}
        />
        <Fact label="Combination defense" value={inc.combinationDefense ? "Yes" : "No"} />
        <Fact label="Country" value={inc.country} />
      </dl>

      {inc.lat != null && inc.lng != null && (
        <IncidentMap
          compact
          showLegend={false}
          points={[
            {
              slug: inc.slug,
              title: inc.title,
              lat: inc.lat,
              lng: inc.lng,
              species: inc.species,
              severity: inc.severity,
              dateDisplay: inc.dateDisplay,
              location: formatLocation(inc),
              summary: inc.summary,
              caliber: inc.caliber,
              firearmType: inc.firearmType,
            },
          ]}
        />
      )}

      <section className="border border-kraft-500/20 bg-moss-900/40 p-5">
        <h2 className="stamp mb-2 text-[10px] text-kraft-400">Narrative</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-moss-100">{inc.summary}</p>
      </section>

      {inc.attribution && (
        <p className="border-l-2 border-kraft-500 pl-3 text-sm text-kraft-300">{inc.attribution}</p>
      )}

      <section>
        <h2 className="stamp mb-2 text-[10px] text-kraft-400">Sources</h2>
        <ul className="space-y-2">
          {inc.sources.map((s) => (
            <li key={s.id}>
              <a
                href={s.url}
                className="text-kraft-300 underline decoration-kraft-500/40 hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                {s.title || s.url}
              </a>
              {s.publisher ? <span className="ml-2 text-xs text-moss-300">— {s.publisher}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="stamp mb-3 text-[10px] text-kraft-400">Related records</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {related.map((r) => (
              <li key={r.id} className="border border-moss-600 bg-moss-900/40 p-3">
                <Link href={`/incidents/${r.slug}`} className="text-sm text-kraft-200 hover:text-white">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-kraft-500/20 bg-moss-950/50 p-3">
      <dt className="stamp text-[10px] text-moss-300">{label}</dt>
      <dd className="mt-1 text-sm text-kraft-200">{value}</dd>
    </div>
  );
}
