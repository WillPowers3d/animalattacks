import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { parseSearchParams, toWhere } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const q = parseSearchParams(raw);
  const where = toWhere(q);
  const incidents = await prisma.incident.findMany({
    where,
    include: { sources: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 2000,
  });

  const headers = [
    "date",
    "datePrecision",
    "title",
    "species",
    "subspecies",
    "severity",
    "city",
    "region",
    "stateProvince",
    "country",
    "lat",
    "lng",
    "firearmType",
    "caliber",
    "shotsFired",
    "defenseOutcome",
    "combinationDefense",
    "sourceType",
    "verified",
    "attribution",
    "sourceUrls",
    "slug",
  ];

  const rows = incidents.map((i) => [
    i.occurredAt ? i.occurredAt.toISOString().slice(0, 10) : i.dateDisplay,
    i.datePrecision,
    i.title,
    i.species,
    i.subspecies,
    i.severity,
    i.city,
    i.region,
    i.stateProvince,
    i.country,
    i.lat,
    i.lng,
    i.firearmType,
    i.caliber,
    i.shotsFired,
    i.defenseOutcome,
    i.combinationDefense,
    i.sourceType,
    i.verified,
    i.attribution,
    i.sources.map((s) => s.url).join(" | "),
    i.slug,
  ]);

  const body = toCsv(headers, rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="animalattacks-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
