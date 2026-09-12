import { runPublicationCrawl } from "../src/lib/publications/crawl";

function flag(name: string): string | undefined {
  const exact = process.argv.find((a) => a === `--${name}`);
  if (exact) return "1";
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

const limitRaw = flag("limit");
const state = flag("state");
const statesRaw = flag("states");
const countryRaw = flag("country") ?? flag("countries");
const since = flag("since");
const dryRun = Boolean(flag("dry-run") || flag("dryRun"));
const backfill = Boolean(flag("backfill"));
const force = Boolean(flag("force"));
const unstated = Boolean(flag("unstated"));
const wildlife = Boolean(flag("wildlife"));
const agencies = Boolean(flag("agencies"));
const newspapersOnly = agencies ? false : flag("all-tiers") ? false : true;
const concurrency = flag("concurrency") ? Number(flag("concurrency")) : undefined;
const states = statesRaw
  ? statesRaw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  : undefined;
const countries = countryRaw
  ? countryRaw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  : undefined;

runPublicationCrawl({
  limit: limitRaw ? Number(limitRaw) : undefined,
  state: state?.toUpperCase(),
  states,
  countries,
  unstated,
  wildlife,
  agencies,
  since,
  dryRun,
  mode: backfill ? "backfill" : "incremental",
  force,
  newspapersOnly,
  concurrency,
})
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors.length > 80 ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
