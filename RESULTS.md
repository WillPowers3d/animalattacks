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
| Still missing a parsed state | **1,912** (domain-only rows; 473 more states inferred this session from news-homepages bundles, unique gazetteer cities, and domain tokens) |

Sources (facts only — name, URL, place): 3DLNews / WM News Lab, sTechLab ICWSM 2022 local-news dataset, firephil/us-news-sites, palewire/news-homepages, Wikidata (CC0), Wikipedia state newspaper lists (CC BY-SA). Deduped by domain; national wires filtered. Rebuild: `npm run publications:build`. Fill missing states: `npm run publications:fill-states`. Append rows: `data/publications/extra.json`.

## This-session crawl (snapshot)

Refresh by re-running the live DB; the table is rewritten as the sweep continues.

| | Count |
| --- | ---: |
| Publications scanned at least once | **5,236** (see latest snapshot — still climbing) |
| Article records fetched (titles/snippets/RSS items) | **87,690** |
| High-precision matches (animal + attack term) | **56** |
| Incidents upserted from local papers | **60** |
| Historical Weingarten + extra seed | 231 (unchanged) |

Priority order: AK, MT, WY, ID, CO, WA, OR, CA, AZ, NM, UT, NV, ME, MN, WI, MI, NH, VT, NY, PA, TN, NC, VA, WV, SD, ND, FL, then remaining black-bear / cougar-range states (TX, OK, AR, GA, KY, MO, IA, KS, NE, LA, AL, SC, MS, OH, IN, IL), then coastal leftovers and unstated domains.

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
- **1,912** directory rows still have no reliable state (mostly firephil / Wikidata / sTechLab domain-only rows parked on the US centroid — not treated as Kansas).
- Incremental mode prefers RSS; `--backfill` is required for deeper sitemaps/site-search.
- Matcher rejects sports/finance/legal “charged with” noise; a few early-session false positives may remain from before that tightening.
- This SQLite session is not the production ledger. Seed the hosted DB (`npm run db:seed`) then resume waves there.
- Canada is out of scope for this directory (US local papers only), even though some border-state papers cover BC/AB/YT incidents.

## Matcher

`npm run test:publications` — require an animal term **and** an attack term in title or snippet.

## Latest snapshot

Generated **2026-09-11T23:43:27.816Z** on this machine’s SQLite database.

| Metric | Count |
| --- | ---: |
| Publications in directory | 14,847 |
| Scanned at least once | **5,236** |
| Uncrawled newspapers remaining | 6,141 |
| Article records fetched | **87,690** |
| Matching articles | **56** |
| Publications with a match | 43 |
| Incidents from local papers | **60** |
| Incidents total (incl. historical seed) | 290 |

### Coverage by state (scanned publications)

| State | Scanned | Articles | Matches |
| --- | ---: | ---: | ---: |
| CA California | 741 | 11612 | 7 |
| NY New York | 446 | 9286 | 3 |
| FL Florida | 342 | 5126 | 1 |
| NC North Carolina | 297 | 4660 | 2 |
| MN Minnesota | 293 | 3437 | 2 |
| MI Michigan | 258 | 3367 | 0 |
| CO Colorado | 229 | 3856 | 8 |
| PA Pennsylvania | 222 | 4427 | 4 |
| VA Virginia | 198 | 3670 | 0 |
| WA Washington | 193 | 2175 | 2 |
| TN Tennessee | 192 | 5694 | 1 |
| WI Wisconsin | 169 | 3087 | 1 |
| AZ Arizona | 137 | 2188 | 0 |
| OR Oregon | 132 | 2311 | 0 |
| ME Maine | 93 | 1013 | 0 |
| UT Utah | 80 | 1021 | 0 |
| MT Montana | 79 | 2409 | 11 |
| ID Idaho | 78 | 1652 | 2 |
| NM New Mexico | 71 | 844 | 1 |
| WV West Virginia | 71 | 1086 | 0 |
| TX Texas | 64 | 1303 | 0 |
| NV Nevada | 62 | 998 | 1 |
| NH New Hampshire | 60 | 735 | 0 |
| SD South Dakota | 60 | 1054 | 0 |
| VT Vermont | 53 | 785 | 0 |
| ND North Dakota | 52 | 576 | 0 |
| AK Alaska | 51 | 1151 | 6 |
| IL Illinois | 45 | 735 | 1 |
| WY Wyoming | 41 | 869 | 3 |
| OH Ohio | 38 | 303 | 0 |
| GA Georgia | 34 | 545 | 0 |
| IA Iowa | 32 | 443 | 0 |
| IN Indiana | 32 | 303 | 0 |
| KS Kansas | 31 | 536 | 0 |
| MA Massachusetts | 29 | 613 | 0 |
| KY Kentucky | 28 | 523 | 0 |
| MO Missouri | 26 | 502 | 0 |
| MS Mississippi | 21 | 65 | 0 |
| LA Louisiana | 20 | 265 | 0 |
| AR Arkansas | 19 | 376 | 0 |
| NE Nebraska | 19 | 294 | 0 |
| AL Alabama | 18 | 514 | 0 |
| CT Connecticut | 17 | 120 | 0 |
| OK Oklahoma | 17 | 251 | 0 |
| MD Maryland | 15 | 280 | 0 |
| SC South Carolina | 12 | 169 | 0 |
| NJ New Jersey | 7 | 87 | 0 |
| HI Hawaii | 6 | 226 | 0 |
| DC District of Columbia | 5 | 148 | 0 |
| RI Rhode Island | 1 | 0 | 0 |

### Local-paper incidents by species

- bear: 38
- mountain_lion: 15
- elk: 4
- moose: 3

### Local-paper incidents by state

- CO: 15
- AK: 10
- MT: 9
- CA: 7
- WY: 3
- ID: 2
- IL: 2
- MN: 2
- PA: 2
- WA: 2
- FL: 1
- NC: 1
- NM: 1
- NV: 1
- NY: 1
- TN: 1

