# Local-paper crawl results

Progressive North American sweep for bear / moose / elk / mountain-lion (cougar, puma) **attack** reports: US local papers (first-pass RSS, then wildlife-state archive backfill), a curated **Canadian** local-news directory, and official **wildlife-agency / park** press feeds. This is **not** a claim that every town or every archive page has been read.

Environment for the numbers below: Cloud Agent SQLite (`file:./dev.db`). The runner database is ephemeral. Production growth needs hosted Postgres (`DATABASE_URL`) and `npm run crawl:waves` or the GitHub Action.

## Directory (committed seed)

| | Count |
| --- | ---: |
| Unique US publications (`data/publications/us-local-news.json.gz`) | **14,847** |
| Canadian local / digital papers (`data/publications/canada-local-news.json`) | **383** (curated + Wikidata/Wikipedia; BC / AB / SK / MB / ON north / YT / NT / NU prioritized) |
| Agency / park press feeds (`data/publications/agency-feeds.json`) | **49** (western state agencies, NPS parks, provincial newsrooms) |
| Newspapers (default crawl set) | **11,377** US + Canadian newspapers |
| TV / radio / broadcast (stored, skipped unless `--all-tiers`) | 3,470 |
| With town or city | 12,252 US + Canadian town centers |
| With coordinates (town center, gazetteer, or state/province centroid) | all seeded rows |
| With RSS URL at seed time | 4,051 US + most Canadian / agency rows |
| Still missing a parsed US state | **1,912** (domain-only rows; first-pass already scanned) |

Sources (facts only — name, URL, place): 3DLNews / WM News Lab, sTechLab ICWSM 2022 local-news dataset, firephil/us-news-sites, palewire/news-homepages, Wikidata (CC0), Wikipedia state newspaper lists (CC BY-SA). Deduped by domain; national wires filtered. Rebuild: `npm run publications:build`. Fill missing states: `npm run publications:fill-states`. Append rows: `data/publications/extra.json`.

## This-session crawl (snapshot)

Refresh by re-running the live DB; the table is rewritten as the sweep continues.

| | Before (first pass) | After this wave |
| --- | ---: | ---: |
| Directory rows | 14,847 US | **15,268** (14,847 US + 383 CA local + 49 agency; some domain overlap) |
| US pubs scanned (RSS first pass) | **11,325** | **11,325** (not re-scanned) |
| Canada pubs seeded / scanned | 0 / 0 | **391 / 389** |
| Agency feeds seeded / scanned | 0 / 0 | **49 / 49** |
| Wildlife-state archive backfill (AK MT WY ID NM UT NV ME NH VT) | 0 | **714 / 715** |
| Canada crawl incidents (`country=CA`, publication-linked) | 0 | **57** |
| Agency incidents (`sourceType=agency`) | 0 | **7** |
| Publication-linked incidents in this VM | 2 leftover | **139** |
| Incidents total in this VM | 231 seed + leftover | **371** |
| Historical Weingarten + extra seed | 231 | 231 |

### Best finds this wave

**Canada:** fatal bear attack near Tulita, NT (musician); Hay River, NT girl injured; Nunavut mauled campers; Vanderhoof / Jasper / Whistler / Squamish / Anmore / Maple Ridge black-bear attacks; Bella Coola school-group grizzly; Prince Albert National Park mother/son; Buffalo Narrows, SK; Shamattawa, MB; Alberta livestock and Banff-area grizzly coverage.

**Agency:** WDFW cougar attack on a Summit Lake jogger; cougar that attacked a child in Stevens County; elk hunter who fended off a cougar; NM Game & Fish bear incidents near Red River and Cedar Crest.

**US archive backfill:** Yellowstone hiker injuries; Grizzly 399 / Lander; Glacier NP fatal; Ovando cyclist; Big Sky hunter; Columbia Falls; Cody hunter.

Priority order: AK, MT, WY, ID, CO, WA, OR, CA, AZ, NM, UT, NV, ME, MN, WI, MI, NH, VT, NY, PA, TN, NC, VA, WV, SD, ND, FL, then remaining black-bear / cougar-range states (TX, OK, AR, GA, KY, MO, IA, KS, NE, LA, AL, SC, MS, OH, IN, IL), then coastal leftovers and unstated domains.

**This continuation** does **not** re-scan the US first pass. It adds three new workstreams:

1. **Wildlife-state archive backfill** (`--backfill --wildlife`) on AK, MT, WY, ID, CO, WA, OR, CA, NM, UT, NV, ME, MN, WI, MI, NH, VT — uses `lastBackfillAt`, so RSS-already-scanned papers still get sitemaps / site search.
2. **Canadian local news** directory + crawl (`--country=CA`) with town-center geocode and `country=CA` pins.
3. **Agency / park press feeds** (`--agencies`) stored as `sourceType=agency`.

Each wave writes `data/publications/crawl-progress.json` + `local-paper-incidents.json` so a new Cloud Agent VM can restore `lastCrawledAt` / `lastBackfillAt` after `npm run db:seed`.

## How to resume (do not start over)

Already-crawled rows have `lastCrawledAt` and are skipped unless `--force`. On a fresh VM, seed first — `db:seed` applies `crawl-progress.json` if present.

```bash
# Restore directory + lastCrawledAt / local-paper incidents
npx prisma db push && npm run db:seed

# Wildlife-dense US archive backfill (does not re-do the RSS first pass)
npm run crawl:waves -- --hours=3 --batch=250 --concurrency=10 --wildlife --backfill

# Canadian local papers
npm run crawl:canada

# Official agency / park feeds
npm run crawl:agencies

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
- **1,912** directory rows had no reliable state; **1,907** of those newspapers are now scanned (5 skipped: `??` names or foreign TLDs).
- Incremental mode prefers RSS; `--backfill` is required for deeper sitemaps/site-search. First-pass leftovers (~52 newspapers) are not the focus of this wave.
- Matcher rejects sports/finance/legal “charged with” noise; a few early-session false positives may remain from before that tightening.
- This SQLite session is not the production ledger. Seed the hosted DB (`npm run db:seed`) then resume waves there.
- First-pass wildlife states (CA, TX, NY, …) were RSS-scanned; archive `--backfill` is the next depth, not a full re-crawl.
- Canadian coverage is a curated local list, not a complete national census.
- Agency feeds share hosts (NPS, Parks Canada); those rows use path-qualified domains so each park can be crawled.

## Matcher

`npm run test:publications` — require an animal term **and** an attack term in title or snippet.

## Latest snapshot

Generated **2026-09-12T15:44:04.285Z**. Combined with the committed first-pass baseline plus this VM’s Canada / agency / wildlife-backfill wave.

| Metric | Count |
| --- | ---: |
| Publications in directory | 15,268 |
| Scanned at least once (combined) | **11,721** |
| This-VM pubs scanned | 5,466 |
| Uncrawled newspapers remaining | 6,332 |
| Article records fetched (combined) | **130,965** |
| This-VM articles | 35,795 |
| Matching articles (combined) | **77** |
| This-VM publication-linked incidents | 139 |
| New incidents this wave (beyond restored) | 0 |
| Publications with a match | 48 |
| Incidents from local / agency feeds (combined) | **188** |
| Canada publications (seeded / scanned) | 391 / 389 |
| Agency feeds (seeded / scanned) | 49 / 49 |
| Incidents total | 371 |

### Incidents by country

- US: 284
- CA: 72
- NO: 10
- RU: 4
- DE: 1

### Incidents by source type

- ammoland: 205
- news: 154
- agency: 7
- other: 5

### Coverage by state / province (scanned publications)

| Region | Scanned | Articles | Matches |
| --- | ---: | ---: | ---: |
| ??  | 2041 | 21525 | 0 |
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
| NJ New Jersey | 157 | 771 | 0 |
| AR Arkansas | 152 | 1205 | 1 |
| OR Oregon | 146 | 2412 | 0 |
| AZ Arizona | 145 | 2328 | 0 |
| MS Mississippi | 141 | 757 | 0 |
| LA Louisiana | 129 | 986 | 0 |
| OK Oklahoma | 117 | 692 | 0 |
| NE Nebraska | 115 | 992 | 0 |
| MD Maryland | 108 | 604 | 0 |
| SC South Carolina | 105 | 572 | 0 |
| ME Maine | 98 | 1124 | 0 |
| MT Montana | 92 | 2553 | 12 |
| NM New Mexico | 85 | 1330 | 2 |
| ID Idaho | 83 | 1764 | 2 |
| UT Utah | 81 | 1021 | 1 |
| WV West Virginia | 80 | 1141 | 0 |
| BC British Columbia | 80 | 224 | 0 |
| NV Nevada | 69 | 1312 | 1 |
| NH New Hampshire | 63 | 836 | 0 |
| SD South Dakota | 61 | 1062 | 0 |
| DC District of Columbia | 58 | 397 | 0 |
| AK Alaska | 58 | 1252 | 6 |
| ON Ontario | 58 | 58 | 0 |
| ND North Dakota | 55 | 688 | 0 |
| VT Vermont | 55 | 796 | 0 |
| HI Hawaii | 48 | 348 | 0 |
| WY Wyoming | 45 | 880 | 3 |
| RI Rhode Island | 41 | 195 | 0 |
| DE Delaware | 38 | 223 | 0 |
| AB Alberta | 36 | 103 | 0 |
| QC Quebec | 24 | 28 | 0 |
| MB Manitoba | 13 | 1 | 0 |
| SK Saskatchewan | 12 | 80 | 14 |
| NB New Brunswick | 8 | 0 | 0 |
| YT Yukon | 5 | 0 | 0 |
| NS Nova Scotia | 4 | 2 | 0 |
| NT Northwest Territories | 4 | 28 | 2 |
| NU Nunavut | 2 | 0 | 0 |
| NL Newfoundland and Labrador | 1 | 1 | 0 |
| PE Prince Edward Island | 1 | 0 | 0 |

### Local / agency incidents by species

- bear: 122
- mountain_lion: 15
- moose: 9
- elk: 4

### Local / agency incidents by region

- BC: 39
- AK: 21
- CO: 15
- MT: 11
- WY: 10
- CA: 7
- VT: 7
- WA: 6
- SK: 6
- FL: 5
- AB: 5
- ME: 5
- UT: 5
- NM: 4
- MB: 4
- AR: 2
- ID: 2
- IL: 2
- MN: 2
- PA: 2
- NT: 2
- NC: 1
- NV: 1
- NY: 1
- OK: 1
- TN: 1
- NU: 1
- WI: 1
- NH: 1

