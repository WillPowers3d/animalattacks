import type { Prisma } from "@prisma/client";

export type IncidentQuery = {
  q?: string;
  species?: string;
  severity?: string;
  country?: string;
  state?: string;
  firearmType?: string;
  caliber?: string;
  outcome?: string;
  verified?: string;
  from?: string;
  to?: string;
  naOnly?: string;
  hide?: string;
};

export function parseSearchParams(
  sp: Record<string, string | string[] | undefined>,
): IncidentQuery {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    q: one("q"),
    species: one("species"),
    severity: one("severity"),
    country: one("country"),
    state: one("state"),
    firearmType: one("firearmType"),
    caliber: one("caliber"),
    outcome: one("outcome"),
    verified: one("verified"),
    from: one("from"),
    to: one("to"),
    naOnly: one("naOnly") ?? "1",
    hide: one("hide"),
  };
}

export function toWhere(q: IncidentQuery): Prisma.IncidentWhereInput {
  const AND: Prisma.IncidentWhereInput[] = [];

  if (q.q?.trim()) {
    const term = q.q.trim();
    AND.push({
      OR: [
        { title: { contains: term } },
        { summary: { contains: term } },
        { city: { contains: term } },
        { region: { contains: term } },
        { stateProvince: { contains: term } },
        { caliber: { contains: term } },
      ],
    });
  }
  if (q.species) AND.push({ species: q.species });
  if (q.severity) AND.push({ severity: q.severity });
  if (q.country) AND.push({ country: q.country });
  if (q.state) AND.push({ stateProvince: q.state });
  if (q.firearmType) AND.push({ firearmType: q.firearmType });
  if (q.caliber) AND.push({ caliber: q.caliber });
  if (q.outcome) AND.push({ defenseOutcome: q.outcome });
  if (q.verified === "1") AND.push({ verified: true });
  if (q.from) AND.push({ occurredAt: { gte: new Date(q.from) } });
  if (q.to) AND.push({ occurredAt: { lte: new Date(q.to) } });
  if (q.naOnly !== "0") AND.push({ country: { in: ["US", "CA", "MX"] } });
  if (q.hide?.trim()) {
    const hidden = q.hide
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hidden.length) AND.push({ species: { notIn: hidden } });
  }

  return AND.length ? { AND } : {};
}

export function toQueryString(q: IncidentQuery) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v && !(k === "naOnly" && v === "1")) params.set(k, v);
  }
  return params.toString();
}
