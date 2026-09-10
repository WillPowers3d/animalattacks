import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  const token = url.searchParams.get("secret");
  if (secret && header !== `Bearer ${secret}` && token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dryRun = url.searchParams.get("dryRun") === "1";
  const result = await runIngest({ dryRun, includeFacebook: true, enrich: Boolean(process.env.OPENAI_API_KEY) });
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return POST(req);
}
