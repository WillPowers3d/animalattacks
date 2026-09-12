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
| Publications scanned at least once | **8,350** combined (7,262 prior + leftover IL/MA/OH/IN wave) |
| Article records fetched (titles/snippets/RSS items) | **104,010** combined |
| High-precision matches (animal + attack term) | **59** prior session (leftover wave added 0 real incidents; one Coke/Santa ad rejected) |
| Incidents upserted from local papers | **64** prior session (SQLite was ephemeral; new finds are now exported) |
| Historical Weingarten + extra seed | 231 (unchanged) |

Priority order: AK, MT, WY, ID, CO, WA, OR, CA, AZ, NM, UT, NV, ME, MN, WI, MI, NH, VT, NY, PA, TN, NC, VA, WV, SD, ND, FL, then remaining black-bear / cougar-range states (TX, OK, AR, GA, KY, MO, IA, KS, NE, LA, AL, SC, MS, OH, IN, IL), then coastal leftovers and unstated domains.

**This continuation** skips re-scanning the well-covered first-wave states and targets leftover **IL, MA, OH, IN**, then other under-scanned states (MS, LA, AL, SC, CT, MD, NJ, DE, RI, HI, DC), then domain-only (`state` null) rows. Each wave writes `data/publications/crawl-progress.json` + `local-paper-incidents.json` so a new Cloud Agent VM can restore `lastCrawledAt` after `npm run db:seed`.

## How to resume (do not start over)

Already-crawled rows have `lastCrawledAt` and are skipped unless `--force`. On a fresh VM, seed first — `db:seed` applies `crawl-progress.json` if present.

```bash
# Restore directory + lastCrawledAt / local-paper incidents
npx prisma db push && npm run db:seed

# Leftover states (IL, MA, OH, IN) then other under-scanned
npm run crawl:waves -- --hours=3 --batch=400 --concurrency=12 --states=IL,MA,OH,IN

# Domain-only / unstated rows
npm run crawl:waves -- --hours=2 --batch=400 --concurrency=12 --unstated

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

Generated **2026-09-12T05:18:25.767Z**. Combined with prior-session aggregates (lost ephemeral SQLite) plus this VM’s leftover-state wave.

| Metric | Count |
| --- | ---: |
| Publications in directory | 14,847 |
| Scanned at least once (combined) | **9,047** |
| This-VM leftover wave scanned | 2,032 |
| Uncrawled newspapers remaining (est.) | 2,330 |
| Article records fetched (combined) | **107,118** |
| This-VM leftover articles | 10,011 |
| Matching articles (combined) | **59** |
| This-VM leftover matches | 0 |
| Publications with a match | 46 |
| Incidents from local papers (combined) | **64** |
| This-VM leftover incidents | 0 |
| Incidents total (incl. historical seed) | 294 |

### Coverage by state (scanned publications)

| State | Scanned | Articles | Matches |
| --- | ---: | ---: | ---: |
| CA California | 781 | 11835 | 7 |
| TX Texas | 536 | 3736 | 0 |
| NY New York | 475 | 9499 | 3 |
| IL Illinois | 399 | 2337 | 1 |
| MA Massachusetts | 368 | 1465 | 0 |
| FL Florida | 354 | 5195 | 1 |
| MN Minnesota | 302 | 3585 | 2 |
| NC North Carolina | 299 | 4671 | 2 |
| GA Georgia | 290 | 1626 | 0 |
| OH Ohio | 283 | 1054 | 0 |
| MI Michigan | 269 | 3489 | 0 |
| MO Missouri | 259 | 1600 | 0 |
| CO Colorado | 240 | 4034 | 9 |
| PA Pennsylvania | 240 | 4602 | 4 |
| WA Washington | 224 | 2675 | 2 |
| VA Virginia | 215 | 3942 | 0 |
| IN Indiana | 214 | 975 | 0 |
| IA Iowa | 208 | 1179 | 0 |
| TN Tennessee | 196 | 5819 | 1 |
| KY Kentucky | 187 | 1269 | 0 |
| WI Wisconsin | 176 | 3212 | 1 |
| CT Connecticut | 168 | 698 | 0 |
| AL Alabama | 166 | 970 | 0 |
| KS Kansas | 158 | 1207 | 0 |
| AR Arkansas | 152 | 1205 | 1 |
| OR Oregon | 146 | 2412 | 0 |
| AZ Arizona | 145 | 2328 | 0 |
| MS Mississippi | 141 | 757 | 0 |
| LA Louisiana | 129 | 986 | 0 |
| OK Oklahoma | 117 | 692 | 0 |
| NE Nebraska | 115 | 992 | 0 |
| SC South Carolina | 105 | 572 | 0 |
| ME Maine | 97 | 1124 | 0 |
| MT Montana | 90 | 2553 | 12 |
| NM New Mexico | 84 | 1330 | 1 |
| ID Idaho | 82 | 1764 | 2 |
| UT Utah | 80 | 1021 | 0 |
| WV West Virginia | 80 | 1141 | 0 |
| NV Nevada | 69 | 1312 | 1 |
| NH New Hampshire | 62 | 836 | 0 |
| SD South Dakota | 61 | 1062 | 0 |
| MD Maryland | 59 | 280 | 0 |
| AK Alaska | 55 | 1252 | 6 |
| ND North Dakota | 55 | 688 | 0 |
| VT Vermont | 55 | 796 | 0 |
| WY Wyoming | 42 | 880 | 3 |
| NJ New Jersey | 7 | 87 | 0 |
| HI Hawaii | 6 | 226 | 0 |
| DC District of Columbia | 5 | 148 | 0 |
| RI Rhode Island | 1 | 0 | 0 |

### Local-paper incidents by species

- bear: 42
- mountain_lion: 15
- elk: 4
- moose: 3

### Local-paper incidents by state

- CO: 15
- AK: 10
- MT: 10
- CA: 7
- WY: 3
- AR: 2
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
- OK: 1
- TN: 1

