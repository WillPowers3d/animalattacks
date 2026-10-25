# animalattacks

North American animal attack tracker — news and social reports focused on bears, mountain lions, elk, and moose.

Public website that compiles **North American animal-attack incidents** into a browsable map, list, and stats ledger. Emphasis: **bears, mountain lions (cougars), elk, and moose**. Historical starter data is Dean Weingarten’s documented handgun defenses against bears, published on [Ammoland](https://www.ammoland.com/) and earlier on [Gun Watch](http://gunwatch.blogspot.com/).

This is **not official wildlife-agency data**.

## Features

- Incident database: species / subspecies, date, city–region–state/province, country (US / CA / MX), severity (fatal / injury / near-miss / property), summary, source URL(s), source type (news / facebook / ammoland / other), verified flag, lat/lng
- Defensive-firearm fields used in Weingarten’s research: `firearmType`, `caliber`, `shotsFired`, `defenseOutcome` (success / failure / indeterminate), `combinationDefense`
- Homepage map + **latest attacks** feed + list with filters (species, region, date, severity, firearm type / caliber)
- Shareable filter URLs and **CSV export** of the filtered ledger
- Incident detail pages with attribution
- Stats: species, region, yearly trend, **handgun caliber effectiveness**
- Full-text search
- About / methodology + disclaimer
- Daily ingest: Google News RSS + pluggable Facebook Graph API (mock if no token), GitHub Action at 12:00 UTC
- Expandable **US local / small-town news directory** + progressive crawler (RSS, sitemaps, site search) that upserts matching animal-attack incidents

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Prisma (SQLite locally, Postgres-ready schema), MapLibre GL, Recharts.

## Quick start

```bash
npm install
cp .env.example .env   # already has SQLite default
npx prisma db push
npm run parse:weingarten   # rebuilds data/weingarten-incidents.json from data/sources/
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed data (Weingarten / Ammoland)

Primary historical corpus is parsed from public articles (copies under `data/sources/`):

| Article | Role |
| --- | --- |
| [Gun Watch, June 2021 — ~104 cases](http://gunwatch.blogspot.com/2021/06/using-handguns-or-pistols-in-defense.html) | Last full published list |
| [Ammoland, March 2022](https://www.ammoland.com/2022/03/update-of-pistol-or-handgun-defenses-against-bears/) | Combination (handgun + other lethal tool) cases |
| [Ammoland, April 2022 — 123](https://www.ammoland.com/2022/04/update-of-pistol-defenses-against-bears-123-cases-98-effective/) | First handgun-only update |
| [Ammoland, Nov 2023 — 170](https://www.ammoland.com/2023/11/handgun-defenses-against-bears-170-documented-incidents-98-effective/) | Second update |
| [Ammoland, May 2024 — ~190](https://www.ammoland.com/2024/05/bear-defense-with-handguns-update-20-more-cases-98-effective/) | Third update |
| [Ammoland, Oct 2025 — 205](https://www.ammoland.com/2025/10/handguns-proven-98-effective-in-205-documented-bear-attacks/) | Fourth update |

`npm run parse:weingarten` extracts dated cases into `data/weingarten-incidents.json`. Additional mountain lion / elk / moose incidents from public news and agency pages live in `data/extra-incidents.json`. `npm run geocode:report` prints city-level vs state-centroid vs country-fallback coverage. Known places get city coordinates; otherwise the map uses state/province centroids so more dots plot.

Parsing is heuristic. Weingarten’s published **98%** figure uses *his* inclusion rules (handgun actually fired; combination cases excluded from the rate). This site stores combination cases with `combinationDefense=true` and shows caliber breakdowns only where we extracted a caliber.

Chuke’s Outdoors and others cite this same public database; we attribute the research to **Dean Weingarten / Ammoland**.

## Daily updates

The ledger is meant to grow every day from public news (and optional Facebook pages). **Do not treat the GitHub runner’s SQLite file as production** — it disappears when the job ends.

### SQLite vs Postgres

| Environment | `DATABASE_URL` | Prisma `provider` | What to do |
| --- | --- | --- | --- |
| Local quickstart | `file:./dev.db` (see `.env.example`) | `sqlite` | `npx prisma db push` then `npm run db:seed` |
| Production / daily ingest | `postgresql://…` hosted URL | `postgresql` | Set the repo/Vercel secret, run `npx tsx scripts/configure-db-provider.ts`, then `npx prisma db push` once and seed |

`scripts/configure-db-provider.ts` flips the schema to `postgresql` when `DATABASE_URL` starts with `postgres`. Field types are already Postgres-ready.

### Dry-run vs live

```bash
npm run ingest          # live: fetch + parse + upsert
npm run ingest:dry      # dry-run: fetch + parse, no writes; exit 1 if hard failures
# optional flags: --no-facebook  --enrich
```

Dry-run still records an `IngestRun` row marked `dryRun=true` so you can see fetched / would-upsert / skipped counts. Live writes new incidents after URL and title+date+location dedupe.

Useful failures (job exits non-zero):

- Scheduled GitHub Action without a `DATABASE_URL` secret
- Every Google News RSS query failed (egress / outage)
- Facebook token + page IDs set, but Graph returned no posts
- Production `/api/ingest` called without `INGEST_SECRET` / `CRON_SECRET`

Partial RSS failures are warnings: other queries still ingest.

### What ingest pulls

- **News:** Google News RSS queries for NA bear / cougar / elk / moose attacks.
- **Facebook:** If `FACEBOOK_ACCESS_TOKEN` and `FACEBOOK_PAGE_IDS` (comma-separated) are set, posts are pulled from Graph API `/{page-id}/posts`. Otherwise a **mock/stub** path runs so the pipeline is testable.
- **Dedupe:** canonical URL, then title + date + location.
- **Parse:** keyword heuristics + city/state geocode. Set `OPENAI_API_KEY` and pass `--enrich` (or set the key for `/api/ingest`) for optional LLM field cleanup.
- **HTTP:** `GET`/`POST /api/ingest` (Bearer `INGEST_SECRET` or `CRON_SECRET`, or `?secret=`). Last runs: `/api/ingest/status`.

### GitHub Action (preferred production path)

`.github/workflows/ingest.yml` runs **daily at 12:00 UTC** and supports **Run workflow** with a dry-run toggle.

Repo secrets:

- **`DATABASE_URL`** — required for the scheduled job (hosted Postgres). Manual dispatch without it smokes against ephemeral SQLite and warns.
- `OPENAI_API_KEY` (optional)
- `FACEBOOK_ACCESS_TOKEN` / `FACEBOOK_PAGE_IDS` (optional)

The job writes a GitHub step summary with the ingest JSON (fetched / upserted / skipped / errors).

### Vercel Cron

`vercel.json` hits `/api/ingest` daily at 12:00 UTC. Set `CRON_SECRET` (Vercel sends `Authorization: Bearer $CRON_SECRET`) and/or `INGEST_SECRET`, plus a production Postgres `DATABASE_URL`. Do not put the secret in the cron path.

### Facebook token setup

1. Create a Meta app with **pages_read_engagement** (and a Page token you are allowed to use).
2. Collect numeric Page IDs for public pages that post wildlife-conflict reports.
3. Put the long-lived Page token in `FACEBOOK_ACCESS_TOKEN` and IDs in `FACEBOOK_PAGE_IDS`.
4. Without those env vars, ingest still runs using two clearly labeled mock posts.

## Postgres

Local default is SQLite (`DATABASE_URL="file:./dev.db"`). For Postgres:

1. Set `DATABASE_URL` to the Postgres URL.
2. `npx tsx scripts/configure-db-provider.ts` (or change `provider = "postgresql"` in `prisma/schema.prisma`).
3. `npx prisma db push` (or migrate) and `npm run db:seed`.

## Local newspaper directory + crawler

National Google News RSS still misses a lot of weeklies. This app ships an **expandable publication directory** and a **progressive crawler** that treats local papers as a first-class ingest source.

It is **not** a complete census of every US town or an all-time scrape of every site. Those jobs are impossible to finish in one run and would be rude even if they were. What we do ship:

1. A large starter directory (thousands of unique domains when sources allow) committed as `data/publications/us-local-news.json.gz`.
2. A `Publication` table (name, homepage, RSS, town/city/state/county, town-center lat/lng, circulation tier, directory provenance, robots status, last crawl).
3. A resumable crawler that prefers RSS/Atom, then sitemaps, then WordPress/site-search archive pages.
4. High-precision matching: an **animal term** (bear, moose, elk, mountain lion / cougar / puma) **and** an **attack term** (attack, attacked, mauling, mauled, charging, …) must appear in the title or snippet before an Incident is created.
5. Dedup by article URL. Location = parsed town/state when possible, otherwise the publication’s **town center**.
6. **Snippets only** — title, URL, ≤400-character excerpt. No full-body archive.

### How the directory was built

`npm run publications:build` merges open sources and writes the gzipped seed + `data/publications/manifest.json`:

| Source | What we take | License / ethics |
| --- | --- | --- |
| [3DLNews / WM News Lab](https://github.com/wm-newslab/3DLNews) | ~14k US local outlets (newspapers, TV, radio) with website, town, lat/lng, optional RSS | Academic compilation of public directory facts. We store name/URL/place/coords only. |
| [sTechLab local-news dataset](https://github.com/sTechLab/local-news-dataset) | ~10k local outlets (name, website, city, state) | Cite [Aubin Le Quéré et al., ICWSM 2022](https://mariannealq.com/wp-content/uploads/2022/05/Local_News_ICWSM_Camera_Ready.pdf). |
| [firephil/us-news-sites](https://github.com/firephil/us-news-sites) | Local / regional news domains | Public domain list. |
| [palewire/news-homepages](https://github.com/palewire/news-homepages) | US site roster | Factual names/URLs from a GPL-3.0 archiver. |
| [Wikidata](https://query.wikidata.org/) | Newspapers, weeklies, news websites with `P17=US` and official website | CC0. |
| [Wikipedia lists of newspapers by state](https://en.wikipedia.org/wiki/List_of_newspapers_in_the_United_States) | External links from each state list | CC BY-SA — attribute Wikipedia contributors. |

Rows are **deduped by domain**. National wires / platforms (NYT, CNN, AP, Facebook, …) are dropped so the table stays local-first. Metro dailies are kept because they still cover nearby towns. TV/radio news sites are stored with `circulationTier` but the default crawl is newspapers / weeklies / digital.

**Honest gaps:** dead papers and broken URLs remain; some towns never had a site; paywalled weeklies may expose RSS titles but not body (we never bypass paywalls or logins); Wikipedia/Wikidata coverage is uneven in the Plains and Deep South; 3DLNews snapshots lag current ownership changes. Re-run the builder and/or append `data/publications/extra.json` to expand.

Live session numbers, state coverage, and resume commands: **[RESULTS.md](RESULTS.md)**. Machine-readable snapshot: `data/publications/crawl-session-report.json`. That SQLite run is not the production database — continue with `npm run crawl:waves` or `npm run crawl:publications -- --backfill` against hosted Postgres.

Town-center coordinates: source lat/lng when present, else a US cities gazetteer, else the existing state-centroid fallback used by the map.

### Crawl CLI

```bash
npm run crawl:publications -- --limit=200
npm run crawl:publications -- --state=MT --since=2018-01-01 --backfill
npm run crawl:publications -- --states=IL,MA,OH,IN --limit=400 --concurrency=12 --since=1990-01-01
npm run crawl:waves -- --hours=3 --batch=400 --concurrency=12 --states=IL,MA,OH,IN --unstated
npm run crawl:publications:dry -- --limit=40 --state=AK
# flags: --limit=N  --state=XX  --states=IL,MA  --unstated  --since=YYYY-MM-DD  --dry-run  --backfill  --force  --all-tiers  --concurrency=8
```

- **Incremental (default):** RSS + recent sitemap URLs; skips publications crawled in the last ~18 hours.
- **Backfill (`--backfill`):** deeper sitemaps + site search (`/?s=bear+attack`, etc.). Resume-friendly: `lastCrawledAt` / `lastBackfillAt` / `PublicationCrawl` rows.
- **Legal / ethics:** `User-Agent` identifies the project; `robots.txt` is fetched and honored (including `Crawl-delay`); ≥1.5s between requests to the same host; no credential stuffing; no paywall bypass; no full-text warehouse.
- **Precision:** matcher tests live in `npm run test:publications`.

Browse the directory and crawl stats at `/publications`. JSON: `GET /api/publications`. Protected crawl trigger: `POST /api/publications/crawl` (same `INGEST_SECRET` / `CRON_SECRET` as news ingest).

### GitHub Action (local papers)

`.github/workflows/crawl-publications.yml` — **daily incremental at 13:30 UTC** and **weekly backfill Sundays 07:15 UTC**, plus manual dispatch (`dry_run`, `backfill`, `limit`, `state`).

Same `DATABASE_URL` secret as daily Google News ingest. No extra crawl secrets. The job uses concurrency 6 and documents rate limits in the step summary. Do not treat the runner’s SQLite file as production.

`npm run ingest` (Google News + optional Facebook) is unchanged and still the national daily path.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync Prisma schema |
| `npm run db:seed` | Load Weingarten + extra JSON + publication directory |
| `npm run db:reset` | Recreate DB + seed |
| `npm run parse:weingarten` | Re-parse `data/sources/` |
| `npm run ingest` / `ingest:dry` | News + Facebook pipeline |
| `npm run publications:build` | Rebuild `data/publications/us-local-news.json.gz` from open sources |
| `npm run publications:fill-states` | Infer missing states; rewrite seed + live DB |
| `npm run crawl:publications` / `crawl:publications:dry` | Scan local papers → upsert incidents |
| `npm run crawl:waves` | Unattended batches until `--hours` budget (`--states`, `--unstated`) |
| `npm run crawl:progress:export` | Write `crawl-progress.json` + `local-paper-incidents.json` |
| `npm run crawl:progress:apply` | Restore lastCrawledAt / incidents onto a fresh seed |
| `npm run results:write` | Refresh RESULTS.md + crawl-session-report.json |
| `npm run test:publications` | Keyword matcher unit checks |
| `npm run geocode:report` | City / state / country geocode coverage |

## License / ethics

Incident text is summarized from public news and Weingarten’s published lists for research/index use. Read the originals. Do not treat caliber charts as a recommendation to carry or use a firearm.

The local-paper crawler identifies itself, honors `robots.txt` (including crawl-delay), rate-limits per host, and stores **title + URL + short snippet** only. It does not bypass paywalls, logins, or bot challenges, and it is not a full-text archive of newspapers. Directory rows are factual name/URL/place records merged from open datasets — see the table above and `data/publications/manifest.json`.
