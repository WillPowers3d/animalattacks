# Local-paper crawl results

First progressive nationwide sweep of the US local-news directory for bear / moose / elk / mountain-lion (cougar, puma) **attack** reports. This is **not** a claim that every US town or every archive page has been read.

Environment for the numbers below: Cloud Agent SQLite (`file:./dev.db`). The runner database is ephemeral. Production growth needs hosted Postgres (`DATABASE_URL`) and `npm run crawl:waves` or the GitHub Action.

## Directory (committed seed)

| | Count |
| --- | ---: |
| Unique publications (`data/publications/us-local-news.json.gz`) | **14,847** |
| Newspapers (default crawl set) | **11,377** |
| TV / radio / broadcast (stored, skipped unless `--all-tiers`) | 3,470 |
| With town or city | 12,252 |
| With coordinates (town center, gazetteer, or state centroid) | 14,847 |
| With RSS URL at seed time | 4,051 |
| Still missing a parsed state | **2,385** (mostly domain-only rows from public lists) |

Sources (facts only — name, URL, place): 3DLNews / WM News Lab, sTechLab ICWSM 2022 local-news dataset, firephil/us-news-sites, palewire/news-homepages, Wikidata (CC0), Wikipedia state newspaper lists (CC BY-SA). Deduped by domain; national wires filtered. Rebuild: `npm run publications:build`. Fill missing states: `npm run publications:fill-states`. Append rows: `data/publications/extra.json`.

## This-session crawl (snapshot)

Refresh by re-running the live DB; the table is rewritten as the sweep continues.

| | Count |
| --- | ---: |
| Publications scanned at least once | see latest snapshot below |
| Article records fetched (titles/snippets/RSS items) | see latest snapshot below |
| High-precision matches (animal + attack term) | see latest snapshot below |
| Incidents upserted from local papers | see latest snapshot below |
| Historical Weingarten + extra seed | 231 (unchanged) |

Priority order: AK, MT, WY, ID, CO, WA, OR, CA, AZ, NM, UT, NV, ME, MN, WI, MI, NH, VT, NY, PA, TN, NC, VA, WV, SD, ND, FL, then remaining states.

## How to resume (do not start over)

Already-crawled rows have `lastCrawledAt` and are skipped unless `--force`.

```bash
# Next batch of never-crawled newspapers, wildlife states first
npm run crawl:publications -- --limit=800 --concurrency=12 --since=1990-01-01

# Multi-hour unattended waves
npm run crawl:waves -- --hours=3 --batch=600 --concurrency=12

# One state, deeper archives / site search
npm run crawl:publications -- --state=ME --backfill --limit=200 --since=1990-01-01

# Dry run
npm run crawl:publications:dry -- --limit=40 --state=AK
```

GitHub Action `.github/workflows/crawl-publications.yml`: daily incremental 13:30 UTC, weekly Sunday backfill. Requires the same hosted `DATABASE_URL` secret as Google News ingest. Concurrency 6, ≥1.5s/host, robots.txt honored. No extra crawl secrets.

Protected HTTP: `POST /api/publications/crawl` with `INGEST_SECRET` / `CRON_SECRET`.

## Legal / ethics

Identifying User-Agent; robots.txt + Crawl-delay; backoff on HTTP 429/503; no paywall/login bypass; **title + URL + ≤400-character snippet only**. Not a full-text newspaper archive.

## Known gaps

- Dead domains, ownership changes, and paywalled weeklies.
- ~2.4k directory rows still have no state (domain-only sources).
- Incremental mode prefers RSS; `--backfill` is required for deeper sitemaps/site-search.
- Matcher rejects sports/finance/legal “charged with” noise; a few early-session false positives may remain from before that tightening.
- This SQLite session is not the production ledger. Seed the hosted DB (`npm run db:seed`) then resume waves there.
- Canada is out of scope for this directory (US local papers only), even though some border-state papers cover BC/AB/YT incidents.

## Matcher

`npm run test:publications` — require an animal term **and** an attack term in title or snippet.

## Latest snapshot

Generated **2026-09-11T20:38:39.846Z** on this machine’s SQLite database.

| Metric | Count |
| --- | ---: |
| Publications in directory | 14,847 |
| Scanned at least once | **1,528** |
| Uncrawled newspapers remaining | 9,849 |
| Article records fetched | **24,783** |
| Matching articles | **39** |
| Publications with a match | 28 |
| Incidents from local papers | **44** |
| Incidents total (incl. historical seed) | 274 |

### Coverage by state (scanned publications)

| State | Scanned | Articles | Matches |
| --- | ---: | ---: | ---: |
| CA California | 696 | 10246 | 7 |
| CO Colorado | 225 | 3770 | 8 |
| WA Washington | 190 | 2117 | 2 |
| OR Oregon | 131 | 2311 | 0 |
| ID Idaho | 78 | 1652 | 2 |
| MT Montana | 78 | 2379 | 11 |
| AK Alaska | 49 | 1091 | 6 |
| WY Wyoming | 41 | 869 | 3 |
| AZ Arizona | 40 | 348 | 0 |

### Local-paper incidents by species

- bear: 28
- mountain_lion: 10
- elk: 3
- moose: 3

### Local-paper incidents by state

- CO: 11
- AK: 9
- MT: 9
- CA: 7
- WY: 3
- ID: 2
- WA: 2
- IL: 1

