import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { regionName } from "@/lib/publications/states";

export const dynamic = "force-dynamic";
export const metadata = { title: "Local news & agency directory" };

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const state = (one("state") ?? "").toUpperCase();
  const country = (one("country") ?? "").toUpperCase();
  const tier = (one("tier") ?? "").toLowerCase();
  const q = (one("q") ?? "").trim();
  const page = Math.max(1, Number(one("page") ?? "1") || 1);
  const pageSize = 75;

  const where = {
    ...(country ? { country } : {}),
    ...(state ? { state } : {}),
    ...(tier ? { circulationTier: tier } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { town: { contains: q } },
            { city: { contains: q } },
            { domain: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, scanned, matched, withRss, rows, byState, lastCrawls] = await Promise.all([
    prisma.publication.count({ where }),
    prisma.publication.count({ where: { ...where, lastCrawledAt: { not: null } } }),
    prisma.publication.count({ where: { ...where, matchCount: { gt: 0 } } }),
    prisma.publication.count({ where: { ...where, rssUrl: { not: null } } }),
    prisma.publication.findMany({
      where,
      orderBy: [{ matchCount: "desc" }, { state: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { incidents: true } } },
    }),
    prisma.publication.groupBy({
      by: ["state"],
      _count: { _all: true },
      orderBy: { state: "asc" },
    }),
    prisma.publicationCrawl.findMany({
      orderBy: { startedAt: "desc" },
      take: 8,
      include: { publication: { select: { name: true, state: true } } },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <section>
        <p className="stamp text-[10px] text-rust-400">Expandable directory</p>
        <h1 className="font-display text-3xl text-kraft-200">Local news & agency publications</h1>
        <p className="mt-2 max-w-3xl text-sm text-moss-200">
          US, Canadian, and Mexican local / small-town news sites plus official wildlife-agency and
          park press feeds. The crawler scans RSS, sitemaps, and site search for bear / moose / elk /
          mountain-lion (puma) attack reports and stores titles, URLs, and short snippets only.
          Filter country=CA, country=MX, or tier=agency to isolate the directories.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat tile="In directory" value={total.toLocaleString()} />
        <Stat tile="Crawled at least once" value={scanned.toLocaleString()} />
        <Stat tile="With RSS hint" value={withRss.toLocaleString()} />
        <Stat tile="Pubs with matches" value={matched.toLocaleString()} />
      </div>

      <form action="/publications" method="get" className="flex flex-col gap-2 sm:flex-row">
        <input name="q" defaultValue={q} placeholder="Name, town, domain…" className="field-input flex-1" />
        <select name="country" defaultValue={country} className="field-input sm:w-36">
          <option value="">All countries</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="MX">Mexico</option>
        </select>
        <select name="tier" defaultValue={tier} className="field-input sm:w-40">
          <option value="">All tiers</option>
          <option value="newspaper">Newspaper</option>
          <option value="digital">Digital</option>
          <option value="agency">Agency / park</option>
        </select>
        <select name="state" defaultValue={state} className="field-input sm:w-48">
          <option value="">All regions</option>
          {byState.map((s) =>
            s.state ? (
              <option key={s.state} value={s.state}>
                {s.state} — {regionName(s.state) || s.state} ({s._count._all})
              </option>
            ) : null,
          )}
        </select>
        <button
          type="submit"
          className="border border-rust-500 bg-rust-600 px-5 py-2 font-mono text-xs uppercase tracking-widest text-white"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto border border-kraft-500/20">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-moss-950 font-mono text-[10px] uppercase tracking-wider text-moss-300">
            <tr>
              <th className="px-3 py-2">Publication</th>
              <th className="px-3 py-2">Town</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Last crawl</th>
              <th className="px-3 py-2">Robots</th>
              <th className="px-3 py-2">Matches</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-kraft-500/10 odd:bg-moss-900/30">
                <td className="px-3 py-2">
                  <a
                    href={p.homepageUrl}
                    className="text-kraft-200 underline decoration-kraft-500/30 hover:text-white"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {p.name}
                  </a>
                  <div className="font-mono text-[10px] text-moss-400">{p.domain}</div>
                </td>
                <td className="px-3 py-2 text-moss-200">{p.town || p.city || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.state || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.country || "—"}</td>
                <td className="px-3 py-2 text-xs text-moss-300">{p.circulationTier || "—"}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-moss-300">
                  {p.lastCrawledAt ? p.lastCrawledAt.toISOString().slice(0, 16).replace("T", " ") : "never"}
                </td>
                <td className="px-3 py-2 text-xs">{p.robotsStatus || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {p.matchCount}
                  {p._count.incidents ? ` · ${p._count.incidents} inc` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between font-mono text-xs text-moss-300">
        <span>
          Page {page} / {pages} · {total.toLocaleString()} rows
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/publications?${new URLSearchParams({ q, state, country, tier, page: String(page - 1) })}`}
              className="border border-kraft-500/40 px-2 py-1 text-kraft-300"
            >
              Prev
            </Link>
          )}
          {page < pages && (
            <Link
              href={`/publications?${new URLSearchParams({ q, state, country, tier, page: String(page + 1) })}`}
              className="border border-kraft-500/40 px-2 py-1 text-kraft-300"
            >
              Next
            </Link>
          )}
        </div>
      </div>

      {lastCrawls.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-kraft-200">Recent crawl rows</h2>
          <ul className="mt-2 space-y-1 font-mono text-xs text-moss-300">
            {lastCrawls.map((c) => (
              <li key={c.id}>
                {c.startedAt.toISOString().slice(0, 16).replace("T", " ")} · {c.publication.name} (
                {c.publication.state ?? "?"}) · fetched {c.fetched} · matched {c.matched} · upserted{" "}
                {c.upserted}
                {c.error ? ` · ${c.error}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
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
