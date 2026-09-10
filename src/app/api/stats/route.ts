import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [bySpecies, bySeverity, byCaliber] = await Promise.all([
    prisma.incident.groupBy({ by: ["species"], _count: true }),
    prisma.incident.groupBy({ by: ["severity"], _count: true }),
    prisma.incident.groupBy({
      by: ["caliber", "defenseOutcome"],
      where: { caliber: { not: null } },
      _count: true,
    }),
  ]);
  return NextResponse.json({ bySpecies, bySeverity, byCaliber });
}
