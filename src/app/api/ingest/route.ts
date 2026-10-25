import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "unauthorized", hint: "Send Authorization: Bearer $INGEST_SECRET or $CRON_SECRET" },
      { status: 401 },
    );
  }
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const result = await runIngest({
    dryRun,
    includeFacebook: true,
    enrich: Boolean(process.env.OPENAI_API_KEY),
  });
  const status = result.errors.length ? 502 : 200;
  return NextResponse.json(result, { status });
}

export async function GET(req: Request) {
  return POST(req);
}
