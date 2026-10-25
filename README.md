# animalattacks

North American animal attack tracker — news and social reports focused on bears, mountain lions, elk, and moose.

Public website that compiles **North American animal-attack incidents** into a browsable map, list, and stats ledger. Emphasis: **bears, mountain lions (cougars), elk, and moose**. Historical starter data is Dean Weingarten’s documented handgun defenses against bears, published on [Ammoland](https://www.ammoland.com/) and earlier on [Gun Watch](http://gunwatch.blogspot.com/).

This is **not official wildlife-agency data**.

## Features

- Incident database: species / subspecies, date, city–region–state/province, country (US / CA / MX), severity (fatal / injury / near-miss / property), summary, source URL(s), source type (news / facebook / ammoland / other), verified flag, lat/lng
- Defensive-firearm fields used in Weingarten’s research: `firearmType`, `caliber`, `shotsFired`, `defenseOutcome` (success / failure / indeterminate), `combinationDefense`
- Homepage map + **All / US / Canada / Mexico** country toggle + **latest attacks** feed + list with filters (species, region, date, severity, firearm type / caliber) + source badges (Weingarten / local paper / agency / Google News)
- Weekly **fatal / injury digest** (`npm run digest` or `/api/digest`) — markdown of new serious incidents since the last run, no email vendor required. `--fatal-only` / `?severity=fatal` skips injury rows.
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

Open [http://localhost:3000](http://localhost:3000). Production: **[DEPLOY.md](DEPLOY.md)** (Vercel + Postgres `DATABASE_URL` + cron secrets).

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
- **Facebook:** Pluggable Graph fetcher (`createFacebookFetcher` in `src/lib/ingest/facebook.ts`). If `FACEBOOK_ACCESS_TOKEN` and `FACEBOOK_PAGE_IDS` (comma-separated numeric IDs or slugs) are set, posts are pulled from Graph API `/{page-id}/posts` (v19.0, paginated). Posts must pass the same animal+attack keyword matcher as local papers before upsert (`sourceType=facebook`). Otherwise a **labeled mock** path runs so the pipeline is testable. Optional: `FACEBOOK_GRAPH_VERSION`, `FACEBOOK_POST_LIMIT`.
- **Dedupe:** canonical URL, same article path on reprint-farm hosts, then title + date + place. Cross-URL reprints (Black Press / CP wire) collapse when the same event shares a distinctive place or a high title overlap.
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

### Facebook token setup (public wildlife / park pages)

This is a **Page-token Graph ingest**, not a scrape of facebook.com. You can only read pages your token is allowed to access.

1. Create a Meta app → add **Facebook Login** / Graph API → request **`pages_read_engagement`** (and generate a **long-lived Page token**, not a short user token).
2. Collect **numeric Page IDs** for public wildlife-agency / park pages (Meta Business Suite → Page settings, or Graph Explorer `?ids=https://www.facebook.com/<slug>`). Suggested slugs: `alaskadfg`, `ColoradoParksandWildlife`, `MTFWP`, `WyomingGameandFish`, `idahofishandgame`, `YellowstoneNPS`, `GlacierNPS`, `RockyNPS`, `ParksCanada`, `BCParks`.
3. Set `FACEBOOK_ACCESS_TOKEN` (the Page token) and `FACEBOOK_PAGE_IDS` (comma-separated). Optional: `FACEBOOK_GRAPH_VERSION=v19.0`, `FACEBOOK_POST_LIMIT=50`.
4. Run `npm run ingest` or the daily Action. Each post is keyword-filtered (`matchAnimalAttack`); sports / ads are dropped; survivors upsert as `sourceType=facebook`.
5. Without those env vars, ingest still runs using **labeled mock posts** (one sports stub is filtered). `npm run test:facebook` covers mock + a fake Graph fixture.

Do **not** put a user token in production. Rotate the Page token if it leaks. The crawler never hits facebook.com HTML.

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
7. **Canada** — curated local/online papers for BC, AB, SK, MB, northern Ontario, YT, NT, NU (`data/publications/canada-local-news.json`). Incidents store `country=Canada` and town-center pins.
8. **Mexico** — curated northern + jaguar / black-bear range papers (`data/publications/mexico-local-news.json`): Sonora, Chihuahua, Coahuila, Nuevo León, Baja California / Sur, then Sinaloa, Durango, Tamaulipas, and Pacific / southeast jaguar states. Town-center geocode, `country=MX`. Spanish matcher: *oso*, *puma*, *león de montaña* + *ataque* / *atacó* / *agredió* / *embistió* (not *maullido*). Moose are N/A; elk is rare.
9. **Agency / park feeds** — official RSS/newsroom pages (`data/publications/agency-feeds.json`) upsert as `sourceType=agency`.

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
npm run crawl:canada
npm run crawl:mexico
npm run crawl:mexico-extras
npm run crawl:cbc
npm run crawl:agencies
npm run crawl:west-backfill
npm run crawl:west-retry
npm run crawl:backfill-wildlife
npm run crawl:publications:dry -- --limit=40 --state=AK
# flags: --limit=N  --state=XX  --states=IL,MA  --country=CA|MX  --wildlife  --west  --agencies
#         --unstated  --since=YYYY-MM-DD  --dry-run  --backfill  --force  --all-tiers  --concurrency=8
#         --timeout-ms=300000  --skip-dead  --uncrawled
```

- **Incremental (default):** RSS + recent sitemap URLs; skips publications crawled in the last ~18 hours.
- **Backfill (`--backfill`):** deeper sitemaps + site search (`/?s=bear+attack`, etc.). Resume-friendly: skips `lastBackfillAt` (not the first-pass `lastCrawledAt`), so wildlife-state archives can be walked without re-doing the RSS pass. `--west` is the deep western core only (AK, MT, WY, ID, CO). `--wildlife` is the wider set (those plus WA/OR/CA/NM/UT/NV/ME/MN/WI/MI/NH/VT). `--west-retry` / `--timeout-ms` + `--skip-dead` finishes the leftover Colorado queue: DNS-dead hosts are marked `dead-host:` and dropped; surviving hosts get a 300s cap at concurrency 2. `--uncrawled` is only never-seen rows (safe for new Mexico extras).
- **Legal / ethics:** `User-Agent` identifies the project; `robots.txt` is fetched and honored (including `Crawl-delay`); ≥1.5s between requests to the same host; no credential stuffing; no paywall bypass; no full-text warehouse.
- **Precision:** matcher tests live in `npm run test:publications`.

Browse the directory at `/publications` (country + agency filters). Live coverage totals: `/data` (includes last-crawl timestamp). JSON: `GET /api/publications`. Protected crawl trigger: `POST /api/publications/crawl` (same `INGEST_SECRET` / `CRON_SECRET` as news ingest). Production deploy: [DEPLOY.md](DEPLOY.md).

### GitHub Action (local papers)

`.github/workflows/crawl-publications.yml` — **daily incremental at 13:30 UTC** and **weekly backfill Sundays 07:15 UTC**, plus manual dispatch (`dry_run`, `backfill`, `limit`, `state`).

Same `DATABASE_URL` secret as daily Google News ingest. No extra crawl secrets. The job uses concurrency 6 and documents rate limits in the step summary. Do not treat the runner’s SQLite file as production.

`npm run ingest` (Google News + optional Facebook) is unchanged and still the national daily path.

### Fatal / injury digest

A weekly (or on-demand) markdown digest of **new fatal and injury incidents** since the last run. No email vendor — the output is a file you can paste, attach, or publish.

```bash
npm run digest                 # write data/digests/latest.md + dated file
npm run digest -- --stdout     # print only
npm run digest -- --days=14    # first-run lookback if no cursor
npm run digest -- --since=2026-09-01
npm run digest -- --fatal-only --stdout
```

- Cursor: `data/digest-cursor.json` (last run timestamp + incident ids).
- HTTP: `GET /api/digest` (markdown with `?format=md`). `?severity=fatal` or `?fatalOnly=1` drops injury rows. Authorized `GET`/`POST` (same `INGEST_SECRET` / `CRON_SECRET`) writes the artifact. Vercel Cron hits `/api/digest` Mondays 14:00 UTC.
- GitHub Action `.github/workflows/digest.yml` — weekly Monday 14:00 UTC + manual dispatch; uploads the markdown as a workflow artifact and prints it in the job summary.

Each row lists species, place, date, and the source link. Confirm with the original story. Weingarten historical rows only appear if they were *newly inserted* after the cursor.

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
| `npm run crawl:mexico` | Mexican local / regional papers (Spanish matcher, town-center pins) |
| `npm run crawl:mexico-extras` | Never-crawled MX extras only (does not re-walk first-pass Mexico) |
| `npm run crawl:west-backfill` | Deep archive backfill for AK / MT / WY / ID / CO only |
| `npm run crawl:west-retry` | Finish leftover west queue (300s timeout, concurrency 2, skip dead hosts) |
| `npm run digest` | Weekly fatal / injury markdown digest (`--fatal-only` optional) |
| `npm test` | Matcher + dedupe + Facebook + digest + dead-host checks |
| `npm run publications:build-mexico` | Rebuild `mexico-local-news.json` (curated + optional Wikidata) |
| `npm run crawl:cbc` | CBC / Radio-Canada regional (HTTP/1.1 + listing scrape) |
| `npm run collapse:reprints` | Merge reprint-farm clones already in the DB |
| `npm run test:publications` | Keyword matcher + event-dedupe unit checks |
| `npm run geocode:report` | City / state / country geocode coverage |

## License / ethics

Incident text is summarized from public news and Weingarten’s published lists for research/index use. Read the originals. Do not treat caliber charts as a recommendation to carry or use a firearm.

The local-paper crawler identifies itself, honors `robots.txt` (including crawl-delay), rate-limits per host, and stores **title + URL + short snippet** only. It does not bypass paywalls, logins, or bot challenges, and it is not a full-text archive of newspapers. Directory rows are factual name/URL/place records merged from open datasets — see the table above and `data/publications/manifest.json`.
