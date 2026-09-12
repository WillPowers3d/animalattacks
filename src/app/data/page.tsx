import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SOURCE_TYPE_LABELS, type SourceType } from "@/lib/types";
import { regionName } from "@/lib/publications/states";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data & crawl coverage" };

function sourceLabel(key: string) {
  return SOURCE_TYPE_LABELS[key as SourceType] ?? key;
}

export default async function DataPage() {
  const [
    incidents,
    bySource,
    byCountry,
    bySpecies,
    pubs,
    scanned,
    canadaPubs,
    canadaScanned,
    agencyPubs,
    agencyScanned,
    pubMatches,
    articles,
    localIncidents,
    recentLocal,
    byRegion,
  ] = await Promise.all([
    prisma.incident.count(),
    prisma.incident.groupBy({ by: ["sourceType"], _count: { _all: true } }),
    prisma.incident.groupBy({ by: ["country"], _count: { _all: true } }),
    prisma.incident.groupBy({ by: ["species"], _count: { _all: true } }),
    prisma.publication.count(),
    prisma.publication.count({ where: { lastCrawledAt: { not: null } } }),
    prisma.publication.count({ where: { country: "CA" } }),
    prisma.publication.count({ where: { country: "CA", lastCrawledAt: { not: null } } }),
    prisma.publication.count({ where: { circulationTier: "agency" } }),
    prisma.publication.count({ where: { circulationTier: "agency", lastCrawledAt: { not: null } } }),
    prisma.publication.count({ where: { matchCount: { gt: 0 } } }),
    prisma.publication.aggregate({ _sum: { scannedArticleCount: true, matchCount: true } }),
    prisma.incident.count({ where: { publicationId: { not: null } } }),
    prisma.incident.findMany({
      where: { publicationId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        slug: true,
        title: true,
        country: true,
        stateProvince: true,
        sourceType: true,
        species: true,
        occurredAt: true,
      },
    }),
    prisma.incident.groupBy({
      by: ["stateProvince"],
      where: { publicationId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const regionRows = byRegion
    .map((r) => ({
      key: r.stateProvince ?? "??",
      name: regionName(r.stateProvince),
      n: r._count._all,
    }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 16);

  return (
    <article className="space-y-8 text-sm leading-relaxed text-moss-100">
      <header>
        <p className="stamp text-[10px] text-rust-400">Ledger coverage</p>
        <h1 className="font-display text-3xl text-kraft-200">Data & crawl stats</h1>
        <p className="mt-2 max-w-3xl text-moss-200">
          Live counts from this database: historical Weingarten cases, extra seed incidents, US
          local-paper crawl, Canadian local news, and official wildlife-agency / park press feeds.
          See <Link href="/about" className="text-kraft-300 underline">methodology</Link> and the{" "}
          <Link href="/publications" className="text-kraft-300 underline">publication directory</Link>.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat tile="Incidents" value={incidents.toLocaleString()} />
        <Stat tile="Publications" value={pubs.toLocaleString()} />
        <Stat tile="Pubs scanned" value={scanned.toLocaleString()} />
        <Stat tile="Articles fetched" value={(articles._sum.scannedArticleCount ?? 0).toLocaleString()} />
        <Stat tile="Canada pubs / scanned" value={`${canadaPubs} / ${canadaScanned}`} />
        <Stat tile="Agency feeds / scanned" value={`${agencyPubs} / ${agencyScanned}`} />
        <Stat tile="Pubs with a match" value={pubMatches.toLocaleString()} />
        <Stat tile="Crawl-sourced incidents" value={localIncidents.toLocaleString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="border border-kraft-500/20 bg-moss-900/40 p-4">
          <h2 className="font-display text-xl text-kraft-200">By source type</h2>
          <ul className="mt-3 space-y-1 font-mono text-xs text-moss-200">
            {bySource
              .sort((a, b) => b._count._all - a._count._all)
              .map((s) => (
                <li key={s.sourceType} className="flex justify-between gap-4">
                  <span>{sourceLabel(s.sourceType)}</span>
                  <span className="text-kraft-200">{s._count._all}</span>
                </li>
              ))}
          </ul>
        </section>
        <section className="border border-kraft-500/20 bg-moss-900/40 p-4">
          <h2 className="font-display text-xl text-kraft-200">By country</h2>
          <ul className="mt-3 space-y-1 font-mono text-xs text-moss-200">
            {byCountry
              .sort((a, b) => b._count._all - a._count._all)
              .map((s) => (
                <li key={s.country} className="flex justify-between gap-4">
                  <span>{s.country}</span>
                  <span className="text-kraft-200">{s._count._all}</span>
                </li>
              ))}
          </ul>
        </section>
        <section className="border border-kraft-500/20 bg-moss-900/40 p-4">
          <h2 className="font-display text-xl text-kraft-200">By species</h2>
          <ul className="mt-3 space-y-1 font-mono text-xs text-moss-200">
            {bySpecies
              .sort((a, b) => b._count._all - a._count._all)
              .map((s) => (
                <li key={s.species} className="flex justify-between gap-4">
                  <span>{s.species}</span>
                  <span className="text-kraft-200">{s._count._all}</span>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="font-display text-xl text-kraft-200">Crawl-sourced incidents by region</h2>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2 font-mono text-xs text-moss-200">
          {regionRows.map((r) => (
            <li key={r.key} className="flex justify-between gap-4 border-b border-kraft-500/10 py-1">
              <span>
                {r.key} {r.name}
              </span>
              <span className="text-kraft-200">{r.n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl text-kraft-200">Latest crawl / agency upserts</h2>
        {recentLocal.length === 0 ? (
          <p className="mt-2 text-moss-300">No publication-linked incidents in this database yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentLocal.map((inc) => (
              <li key={inc.slug}>
                <Link href={`/incidents/${inc.slug}`} className="text-kraft-200 underline decoration-kraft-500/30">
                  {inc.title}
                </Link>
                <div className="font-mono text-[10px] text-moss-400">
                  {inc.species} · {inc.country}
                  {inc.stateProvince ? `-${inc.stateProvince}` : ""} · {inc.sourceType}
                  {inc.occurredAt ? ` · ${inc.occurredAt.toISOString().slice(0, 10)}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function Stat({ tile, value }: { tile: string; value: string }) {
  return (
    <div className="border border-kraft-500/25 bg-moss-900/50 p-4">
      <p className="stamp text-[10px] text-moss-300">{tile}</p>
      <p className="font-display text-3xl text-kraft-200">{value}</p>
    </div>
  );
}
