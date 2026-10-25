import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const runs = await prisma.ingestRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 8,
  });
  return NextResponse.json({
    count: runs.length,
    runs: runs.map((r) => ({
      id: r.id,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      source: r.source,
      dryRun: r.dryRun,
      fetched: r.fetched,
      upserted: r.upserted,
      skipped: r.skipped,
      errors: r.errors,
    })),
  });
}
