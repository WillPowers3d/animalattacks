import { NextResponse } from "next/server";
import { runPublicationCrawl } from "@/lib/publications/crawl";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request) {
  const ingest = process.env.INGEST_SECRET;
  const cron = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  const token = url.searchParams.get("secret");
  const expected = [ingest, cron].filter(Boolean) as string[];
  if (expected.length) {
    const bearerOk = expected.some((secret) => header === `Bearer ${secret}`);
    const queryOk = Boolean(token && expected.includes(token));
    return bearerOk || queryOk;
  }
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const result = await runPublicationCrawl({
    dryRun: url.searchParams.get("dryRun") === "1",
    state: url.searchParams.get("state") ?? undefined,
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 40,
    mode: url.searchParams.get("backfill") === "1" ? "backfill" : "incremental",
    since: url.searchParams.get("since") ?? undefined,
  });
  return NextResponse.json(result, { status: result.errors.length > 80 ? 502 : 200 });
}

export async function GET(req: Request) {
  return POST(req);
}
