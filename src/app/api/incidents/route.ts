import { NextResponse } from "next/server";
import { parseSearchParams, toWhere } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const q = parseSearchParams(raw);
  const take = Math.min(Number(url.searchParams.get("limit") ?? 100), 250);
  const incidents = await prisma.incident.findMany({
    where: toWhere(q),
    include: { sources: true },
    orderBy: { occurredAt: "desc" },
    take,
  });
  return NextResponse.json({ count: incidents.length, incidents });
}
