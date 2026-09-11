import { prisma } from "../prisma";
import { NEWS_QUERIES, fetchNewsItems } from "./news";
import { heuristicParse, maybeEnrichWithOpenAI } from "./parse";
import { facebookToIncident, fetchFacebookPosts } from "./facebook";
import { alreadyExists, persistIncident } from "./persist";

export type IngestOptions = {
  dryRun?: boolean;
  includeFacebook?: boolean;
  enrich?: boolean;
};

export type IngestResult = {
  fetched: number;
  upserted: number;
  skipped: number;
  dryRun: boolean;
  errors: string[];
  warnings: string[];
  samples: { title: string; url: string; action: string }[];
  facebookMode: "live" | "mock";
};

export async function runIngest(opts: IngestOptions = {}): Promise<IngestResult> {
  const dryRun = Boolean(opts.dryRun);
  const errors: string[] = [];
  const warnings: string[] = [];
  const samples: IngestResult["samples"] = [];
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  const facebookMode: IngestResult["facebookMode"] =
    process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_IDS ? "live" : "mock";

  const run = await prisma.ingestRun.create({
    data: { source: "news+facebook", dryRun },
  });

  try {
    const news = await fetchNewsItems();
    fetched += news.items.length;
    if (news.failures.length) {
      for (const fail of news.failures) {
        warnings.push(`RSS "${fail.query}": ${fail.error}`);
      }
    }
    if (!news.items.length && news.failures.length) {
      errors.push(
        `News ingest fetched 0 items. ${news.failures.length} RSS quer${news.failures.length === 1 ? "y" : "ies"} failed. Check network egress to news.google.com.`,
      );
    } else if (news.failures.length === NEWS_QUERIES.length) {
      errors.push("Every Google News RSS query failed.");
    }

    for (const item of news.items) {
      let inc = heuristicParse(item);
      if (opts.enrich) inc = await maybeEnrichWithOpenAI(inc);
      const exists = await alreadyExists(inc);
      if (exists) {
        skipped += 1;
        samples.push({ title: inc.title, url: inc.sources[0]?.url ?? "", action: "skip-dup" });
        continue;
      }
      if (!dryRun) await persistIncident(inc);
      upserted += 1;
      samples.push({ title: inc.title, url: inc.sources[0]?.url ?? "", action: dryRun ? "dry-upsert" : "upsert" });
    }

    if (opts.includeFacebook !== false) {
      const posts = await fetchFacebookPosts();
      fetched += posts.length;
      if (facebookMode === "live" && posts.length === 0) {
        errors.push(
          "Facebook Graph returned no posts. Check FACEBOOK_ACCESS_TOKEN (long-lived Page token) and FACEBOOK_PAGE_IDS.",
        );
      }
      if (facebookMode === "mock") {
        warnings.push("Facebook: FACEBOOK_ACCESS_TOKEN / FACEBOOK_PAGE_IDS unset — using labeled mock posts.");
      }
      for (const post of posts) {
        const inc = facebookToIncident(post);
        if (!inc) {
          skipped += 1;
          continue;
        }
        const exists = await alreadyExists(inc);
        if (exists) {
          skipped += 1;
          continue;
        }
        if (!dryRun) await persistIncident(inc);
        upserted += 1;
        samples.push({
          title: inc.title,
          url: inc.sources[0]?.url ?? "",
          action: dryRun ? "dry-fb" : "upsert-fb",
        });
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const errorText = [...errors, ...warnings.map((w) => `warn: ${w}`)].join("\n") || null;

  await prisma.ingestRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      fetched,
      upserted,
      skipped,
      errors: errorText,
    },
  });

  return {
    fetched,
    upserted,
    skipped,
    dryRun,
    errors,
    warnings,
    samples: samples.slice(0, 40),
    facebookMode,
  };
}
