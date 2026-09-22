import { NextResponse } from "next/server";
import { buildFatalInjuryDigest, loadDigestCursor } from "@/lib/digest";

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
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const authed = authorized(req);
  const writeFlag = url.searchParams.get("write");
  const write = writeFlag === "1" ? authed : writeFlag === "0" ? false : authed;
  if (writeFlag === "1" && !authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const fatalOnly =
    url.searchParams.get("fatalOnly") === "1" ||
    url.searchParams.get("fatal-only") === "1" ||
    url.searchParams.get("severity") === "fatal";
  const result = await buildFatalInjuryDigest({
    since: url.searchParams.get("since") ?? undefined,
    days: url.searchParams.get("days") ? Number(url.searchParams.get("days")) : undefined,
    write,
    fatalOnly,
  });
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/markdown") || url.searchParams.get("format") === "md") {
    return new NextResponse(result.markdown, {
      status: 200,
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  }
  return NextResponse.json({
    ...result,
    incidents: result.incidents.map((i) => ({
      slug: i.slug,
      title: i.title,
      species: i.species,
      severity: i.severity,
      place: [i.city, i.stateProvince, i.country].filter(Boolean).join(", "),
      date: i.occurredAt?.toISOString().slice(0, 10) ?? null,
      sourceUrl: i.sourceUrl,
    })),
    cursor: loadDigestCursor(),
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const fatalOnly =
    url.searchParams.get("fatalOnly") === "1" ||
    url.searchParams.get("fatal-only") === "1" ||
    url.searchParams.get("severity") === "fatal";
  const result = await buildFatalInjuryDigest({
    since: url.searchParams.get("since") ?? undefined,
    days: url.searchParams.get("days") ? Number(url.searchParams.get("days")) : undefined,
    write: url.searchParams.get("write") !== "0",
    fatalOnly,
  });
  return NextResponse.json(result);
}
