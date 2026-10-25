import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state")?.toUpperCase() ?? undefined;
  const country = url.searchParams.get("country")?.toUpperCase() ?? undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? "100") || 100));
  const rows = await prisma.publication.findMany({
    where: { ...(country ? { country } : {}), ...(state ? { state } : {}) },
    orderBy: [{ matchCount: "desc" }, { state: "asc" }, { name: "asc" }],
    take: limit,
    select: {
      name: true,
      homepageUrl: true,
      domain: true,
      town: true,
      city: true,
      state: true,
      country: true,
      lat: true,
      lng: true,
      circulationTier: true,
      directorySource: true,
      lastCrawledAt: true,
      robotsStatus: true,
      matchCount: true,
      scannedArticleCount: true,
      rssUrl: true,
    },
  });
  const totals = {
    publications: await prisma.publication.count(),
    crawled: await prisma.publication.count({ where: { lastCrawledAt: { not: null } } }),
    matches: await prisma.publication.aggregate({ _sum: { matchCount: true } }),
  };
  return NextResponse.json({ totals, rows });
}
