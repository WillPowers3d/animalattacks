import fs from "node:fs";
import path from "node:path";
import { prisma } from "./prisma";
import { SPECIES_LABELS, SEVERITY_LABELS, type Severity, type Species } from "./types";

export const DIGEST_CURSOR_PATH = "data/digest-cursor.json";
export const DIGEST_LATEST_PATH = "data/digests/latest.md";

export type DigestCursor = {
  lastRunAt: string;
  incidentIds: string[];
  generatedAt?: string;
  count?: number;
};

export type DigestIncident = {
  id: string;
  slug: string;
  title: string;
  species: string;
  severity: string;
  city: string | null;
  stateProvince: string | null;
  country: string;
  occurredAt: Date | null;
  createdAt: Date;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

export type DigestResult = {
  generatedAt: string;
  since: string;
  count: number;
  fatal: number;
  injury: number;
  markdown: string;
  incidents: DigestIncident[];
  cursorPath: string;
  latestPath: string;
};

function rootDir() {
  return process.cwd();
}

export function loadDigestCursor(): DigestCursor | null {
  const p = path.join(rootDir(), DIGEST_CURSOR_PATH);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as DigestCursor;
  } catch {
    return null;
  }
}

export function defaultSince(days = 7): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function placeLine(inc: DigestIncident) {
  const bits = [inc.city, inc.stateProvince, inc.country].filter(Boolean);
  return bits.join(", ") || "place unknown";
}

function dateLine(inc: DigestIncident) {
  if (inc.occurredAt) return inc.occurredAt.toISOString().slice(0, 10);
  return `first seen ${inc.createdAt.toISOString().slice(0, 10)}`;
}

function sourceLink(inc: DigestIncident) {
  if (!inc.sourceUrl) return "no source URL";
  const label = inc.sourceTitle?.trim() || inc.sourceUrl;
  return `[${label}](${inc.sourceUrl})`;
}

export function renderDigestMarkdown(input: {
  generatedAt: Date;
  since: Date;
  incidents: DigestIncident[];
}): string {
  const fatal = input.incidents.filter((i) => i.severity === "fatal");
  const injury = input.incidents.filter((i) => i.severity === "injury");
  const lines = (rows: DigestIncident[]) =>
    rows.length
      ? rows.map((inc) => {
          const species = SPECIES_LABELS[inc.species as Species] ?? inc.species;
          const sev = SEVERITY_LABELS[inc.severity as Severity] ?? inc.severity;
          return `- **${species}** (${sev}) — ${placeLine(inc)} — ${dateLine(inc)} — ${sourceLink(inc)}\n  ${inc.title}`;
        })
      : ["- None in this window."];

  return [
    "# Fatal / injury alert digest",
    "",
    `Generated **${input.generatedAt.toISOString()}**. New ledger rows with severity fatal or injury since **${input.since.toISOString()}**.`,
    "",
    `| | Count |`,
    `| --- | ---: |`,
    `| New incidents | **${input.incidents.length}** |`,
    `| Fatal | ${fatal.length} |`,
    `| Injury | ${injury.length} |`,
    "",
    "This is not official wildlife-agency data. Confirm every row with the source link.",
    "",
    `## Fatal (${fatal.length})`,
    "",
    ...lines(fatal),
    "",
    `## Injury (${injury.length})`,
    "",
    ...lines(injury),
    "",
  ].join("\n");
}

export async function buildFatalInjuryDigest(opts: {
  since?: string | Date;
  days?: number;
  write?: boolean;
} = {}): Promise<DigestResult> {
  const cursor = loadDigestCursor();
  const since = opts.since
    ? new Date(opts.since)
    : cursor?.lastRunAt
      ? new Date(cursor.lastRunAt)
      : defaultSince(opts.days ?? 7);
  const generatedAt = new Date();

  const firstRun = !cursor && !opts.since;
  const rows = await prisma.incident.findMany({
    where: {
      severity: { in: ["fatal", "injury"] },
      sourceType: { not: "ammoland" },
      ...(firstRun ? { occurredAt: { gte: since } } : { createdAt: { gt: since } }),
    },
    orderBy: [{ severity: "asc" }, { occurredAt: "desc" }, { createdAt: "desc" }],
    include: { sources: { take: 1, orderBy: { createdAt: "asc" } } },
  });

  const incidents: DigestIncident[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    species: r.species,
    severity: r.severity,
    city: r.city,
    stateProvince: r.stateProvince,
    country: r.country,
    occurredAt: r.occurredAt,
    createdAt: r.createdAt,
    sourceUrl: r.sources[0]?.url ?? null,
    sourceTitle: r.sources[0]?.title ?? r.sources[0]?.publisher ?? null,
  }));

  const markdown = renderDigestMarkdown({ generatedAt, since, incidents });
  const cursorPath = path.join(rootDir(), DIGEST_CURSOR_PATH);
  const latestPath = path.join(rootDir(), DIGEST_LATEST_PATH);

  if (opts.write) {
    fs.mkdirSync(path.dirname(latestPath), { recursive: true });
    fs.writeFileSync(latestPath, markdown);
    const dated = path.join(
      rootDir(),
      "data/digests",
      `${generatedAt.toISOString().slice(0, 10)}.md`,
    );
    fs.writeFileSync(dated, markdown);
    const next: DigestCursor = {
      lastRunAt: generatedAt.toISOString(),
      incidentIds: incidents.map((i) => i.id),
      generatedAt: generatedAt.toISOString(),
      count: incidents.length,
    };
    fs.mkdirSync(path.dirname(cursorPath), { recursive: true });
    fs.writeFileSync(cursorPath, `${JSON.stringify(next, null, 2)}\n`);
  }

  return {
    generatedAt: generatedAt.toISOString(),
    since: since.toISOString(),
    count: incidents.length,
    fatal: incidents.filter((i) => i.severity === "fatal").length,
    injury: incidents.filter((i) => i.severity === "injury").length,
    markdown,
    incidents,
    cursorPath,
    latestPath,
  };
}
