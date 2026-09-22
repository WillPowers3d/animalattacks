import { renderDigestMarkdown, type DigestIncident } from "../src/lib/digest";

const rows: DigestIncident[] = [
  {
    id: "1",
    slug: "fatal-bear",
    title: "Fatal bear attack near Canmore",
    species: "bear",
    severity: "fatal",
    city: "Canmore",
    stateProvince: "AB",
    country: "CA",
    occurredAt: new Date("2026-09-01"),
    createdAt: new Date("2026-09-02"),
    sourceUrl: "https://example.com/fatal",
    sourceTitle: "CBC",
  },
  {
    id: "2",
    slug: "injury-cougar",
    title: "Cougar injures jogger",
    species: "mountain_lion",
    severity: "injury",
    city: "Boulder",
    stateProvince: "CO",
    country: "US",
    occurredAt: new Date("2026-09-03"),
    createdAt: new Date("2026-09-03"),
    sourceUrl: "https://example.com/injury",
    sourceTitle: "Daily Camera",
  },
];

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL ${msg}`);
  } else {
    console.log(`ok  ${msg}`);
  }
}

const both = renderDigestMarkdown({
  generatedAt: new Date("2026-09-15T00:00:00Z"),
  since: new Date("2026-09-01T00:00:00Z"),
  incidents: rows,
});
assert(both.includes("## Fatal (1)"), "combined digest has fatal section");
assert(both.includes("## Injury (1)"), "combined digest has injury section");
assert(both.includes("Fatal bear attack near Canmore"), "fatal row present");
assert(both.includes("Cougar injures jogger"), "injury row present");

const fatalOnly = renderDigestMarkdown({
  generatedAt: new Date("2026-09-15T00:00:00Z"),
  since: new Date("2026-09-01T00:00:00Z"),
  incidents: rows.filter((r) => r.severity === "fatal"),
  fatalOnly: true,
});
assert(fatalOnly.includes("# Fatal alert digest"), "fatal-only title");
assert(fatalOnly.includes("## Fatal (1)"), "fatal-only still lists fatal");
assert(!fatalOnly.includes("## Injury"), "fatal-only omits injury heading");
assert(!fatalOnly.includes("Cougar injures jogger"), "fatal-only omits injury row");
assert(fatalOnly.includes("severity fatal only"), "fatal-only copy says so");

if (failed) {
  console.error(`${failed} digest tests failed`);
  process.exit(1);
}
console.log("All digest tests passed.");
