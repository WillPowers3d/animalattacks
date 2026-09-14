import { buildFatalInjuryDigest } from "../src/lib/digest";
import { prisma } from "../src/lib/prisma";

function flag(name: string): string | undefined {
  const exact = process.argv.find((a) => a === `--${name}`);
  if (exact) return "1";
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

const since = flag("since");
const days = flag("days") ? Number(flag("days")) : undefined;
const write = Boolean(flag("write")) || !flag("stdout");

buildFatalInjuryDigest({ since, days, write })
  .then((result) => {
    process.stdout.write(result.markdown);
    if (write) {
      console.error(
        JSON.stringify(
          {
            wrote: true,
            count: result.count,
            fatal: result.fatal,
            injury: result.injury,
            since: result.since,
            latestPath: result.latestPath,
          },
          null,
          2,
        ),
      );
    }
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
