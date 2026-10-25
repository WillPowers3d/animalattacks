import slugify from "slugify";
import type { SeedIncident } from "./types";

function shortHash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function makeSlug(title: string, occurredAt?: string | null, extra?: string) {
  const base = slugify(title, { lower: true, strict: true }).slice(0, 64);
  const stamp = (occurredAt ?? "undated").slice(0, 10);
  const tail = extra ? shortHash(extra) : "";
  return [base, stamp, tail].filter(Boolean).join("-");
}

export function makeExternalKey(inc: Pick<SeedIncident, "title" | "occurredAt" | "sources">) {
  const url = inc.sources[0]?.url ?? "";
  const stamp = inc.occurredAt ?? "undated";
  return `${stamp}|${url}|${inc.title}`.toLowerCase().slice(0, 220);
}

export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeKey(input: {
  url?: string | null;
  title: string;
  occurredAt?: string | Date | null;
  city?: string | null;
  stateProvince?: string | null;
}) {
  if (input.url) return `url:${input.url.toLowerCase().split("?")[0]}`;
  const date =
    input.occurredAt instanceof Date
      ? input.occurredAt.toISOString().slice(0, 10)
      : (input.occurredAt ?? "").toString().slice(0, 10);
  return `tdl:${normalizeTitle(input.title)}|${date}|${(input.city ?? "").toLowerCase()}|${(input.stateProvince ?? "").toLowerCase()}`;
}

export function formatLocation(inc: {
  city?: string | null;
  region?: string | null;
  stateProvince?: string | null;
  country?: string | null;
}) {
  return [inc.city || inc.region, inc.stateProvince, inc.country]
    .filter(Boolean)
    .join(", ");
}
