import { IncidentCard } from "@/components/IncidentCard";
import { parseSearchParams, toWhere } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = parseSearchParams(await searchParams);
  const q = sp.q?.trim() ?? "";
  const results = q
    ? await prisma.incident.findMany({
        where: toWhere({ ...sp, naOnly: "0" }),
        orderBy: { occurredAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <div className="space-y-6">
      <section>
        <p className="stamp text-[10px] text-rust-400">Index search</p>
        <h1 className="font-display text-3xl text-kraft-200">Search incidents</h1>
      </section>
      <form action="/search" method="get" className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          defaultValue={q}
          placeholder="Caliber, place, name, species keyword…"
          className="field-input flex-1"
        />
        <button
          type="submit"
          className="border border-rust-500 bg-rust-600 px-5 py-2 font-mono text-xs uppercase tracking-widest text-white"
        >
          Search
        </button>
      </form>
      {q && (
        <p className="font-mono text-xs text-moss-300">
          {results.length} hit{results.length === 1 ? "" : "s"} for “{q}”
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {results.map((inc) => (
          <IncidentCard key={inc.id} incident={inc} />
        ))}
      </div>
    </div>
  );
}
