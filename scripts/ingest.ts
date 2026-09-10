import { runIngest } from "../src/lib/ingest/run";

const dryRun = process.argv.includes("--dry-run");
const noFb = process.argv.includes("--no-facebook");
const enrich = process.argv.includes("--enrich");

runIngest({ dryRun, includeFacebook: !noFb, enrich })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors.length ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
