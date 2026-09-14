# Local-paper crawl results

Progressive North American sweep for bear / moose / elk / mountain-lion (cougar, puma) **attack** reports: US local papers (first-pass RSS, then wildlife-state archive backfill), a curated **Canadian** local-news directory, and official **wildlife-agency / park** press feeds. This is **not** a claim that every town or every archive page has been read.

Environment for the numbers below: Cloud Agent SQLite (`file:./dev.db`). The runner database is ephemeral. Production growth needs hosted Postgres (`DATABASE_URL`) and `npm run crawl:waves` or the GitHub Action.

## Directory (committed seed)

| | Count |
| --- | ---: |
| Unique US publications (`data/publications/us-local-news.json.gz`) | **14,847** |
| Canadian local / digital papers (`data/publications/canada-local-news.json`) | **383** (curated + Wikidata/Wikipedia; BC / AB / SK / MB / ON north / YT / NT / NU prioritized) |
| Canada priority extras (`data/publications/canada-priority-extra.json`) | **CBC regional + Radio-Canada + NNSL territories + northern weeklies** (path-qualified so they do not collide with national hosts) |
| Mexican local / regional papers (`data/publications/mexico-local-news.json`) | **199** (99 curated northern + jaguar / black-bear range, plus Wikidata; ISO 3166-2:MX codes so BCN ≠ BC) |
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

| | After Canada-priority (PR #3) | After dedupe + CBC (this PR) |
| --- | ---: | ---: |
| Directory rows | **15,308** | **15,308** (CBC RSS URLs pointed at `rss.cbc.ca` lineup) |
| US pubs scanned (RSS first pass) | **11,325** | **11,325** (not re-scanned) |
| Canada pubs seeded / scanned | **432 / 314** | **432 / 314** + **14** CBC/Radio-Canada regional re-crawled |
| Agency feeds seeded / scanned | **49 / 47** | **49 / 47** |
| Canada publication-linked unique incidents | **162** (988 raw matcher hits) | **132** after event-dedupe on the committed seed, then **208** after CBC Google News + listings (77 new CBC stories, 10 merged reprints) |
| CBC regional RSS | HTTP/2 stall | **299** articles via HTTP/1.1 / `rss.cbc.ca` (14 pubs; 1 Edmonton timeout). Current feeds had no live attack items; historical stories came from Google News `site:cbc.ca` + listing scrape (**256** URLs, **87** matcher hits). |
| Agency incidents (`sourceType=agency`) | **7** | **7** |
| Incidents total in this VM | **487** | **522** (205 Weingarten + extras + deduped locals + CBC) |
| Historical Weingarten | 205–231 | **205** ammoland (unchanged; fuzzy merge never absorbs Weingarten) |

### Best finds this wave

**CBC (this PR):** Whistler / Anmore back-deck maulings; Bella Coola school-group wire now one pin; Red Lake, ON fatal; Dawson City campground; Water Valley / Calgary-area grizzlies; Nunavut polar-bear survivor; Coquitlam rescue; B.C. hunter hospitalized. Regional RSS (`rss.cbc.ca`) is live again.

**Canada (priority, prior wave):** Mayo, YT woman and 10-month-old killed; Tulita, NT musician killed; Hay River, NT child injured; Iqaluit-area worker killed by polar bear; Sanirajak / Naujaat / Auyuittuq polar-bear attacks; Fort Frances / Kenora / Armstrong, ON black-bear injuries; Bella Coola school-group grizzly; Maple Ridge / Anmore / Squamish / Whistler / Vanderhoof / Pemberton / Shuswap; Rocky Mountain House and Banff-area cougars; Jasper / Waterton grizzlies; Prince Albert NP mother/son; Buffalo Narrows, SK; Shamattawa, MB. French Radio-Canada / territorial weeklies now match `ours` / `orignal` / `couguar` + `attaque`.

**Agency:** WDFW cougar attack on a Summit Lake jogger; cougar that attacked a child in Stevens County; elk hunter who fended off a cougar; NM Game & Fish bear incidents near Red River and Cedar Crest.

**US archive backfill:** Yellowstone hiker injuries; Grizzly 399 / Lander; Glacier NP fatal; Ovando cyclist; Big Sky hunter; Columbia Falls; Cody hunter.

Priority order: AK, MT, WY, ID, CO, WA, OR, CA, AZ, NM, UT, NV, ME, MN, WI, MI, NH, VT, NY, PA, TN, NC, VA, WV, SD, ND, FL, then remaining black-bear / cougar-range states (TX, OK, AR, GA, KY, MO, IA, KS, NE, LA, AL, SC, MS, OH, IN, IL), then coastal leftovers and unstated domains.

**This continuation** does **not** re-scan the US first pass or re-litigate the Canada directory. New workstreams:

1. **Mexico coverage** — curated local/regional directory + Spanish matcher (`oso` / `puma` / `león de montaña` + `ataque` / `atacó` / `agredió` / `embistió`) + town-center geocode + `country=MX` + All/US/Canada/Mexico map filter.
2. **Fatal / injury digest** — `npm run digest` / `GET /api/digest` / weekly GitHub Action. Markdown artifact of new serious incidents since the last run.
3. **Deep western US archive backfill** — `--west --backfill` on **AK, MT, WY, ID, CO only** (skipped in PR #4). High-precision matcher; dedupe against existing incidents.

Each wave writes `data/publications/crawl-progress.json` + `local-paper-incidents.json` so a new Cloud Agent VM can restore `lastCrawledAt` / `lastBackfillAt` after `npm run db:seed`.

## How to resume (do not start over)

Already-crawled rows have `lastCrawledAt` and are skipped unless `--force`. On a fresh VM, seed first — `db:seed` applies `crawl-progress.json` if present.

```bash
# Restore directory + lastCrawledAt / local-paper incidents
npx prisma db push && npm run db:seed

# Wildlife-dense US archive backfill (does not re-do the RSS first pass)
npm run crawl:waves -- --hours=3 --batch=250 --concurrency=10 --wildlife --backfill

# Canadian local papers (RSS + site-search; skips heavy sitemaps)
npm run crawl:canada

# Mexican local / regional papers (Spanish matcher; town-center pins)
npm run crawl:mexico

# Deep western US archives only (AK, MT, WY, ID, CO)
npm run crawl:west-backfill

# Fatal / injury markdown digest
npm run digest

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
- Canadian coverage is a curated local list, not a complete national census. This pass retries CBC / Radio-Canada regional feeds over HTTP/1.1 (`politeFetch` + listing scrape) after the prior HTTP/2 stall.
- Prairie / Black Press weeklies reprint the same Bella Coola and Maple Ridge stories. Cross-URL event dedupe now collapses same-event clones (place + title/date), not just exact URLs. **Canada publication-linked unique count: 162 → 132** on the committed local-paper seed (30 reprints merged; Bella Coola school-group wire 19→1).
- Agency feeds share hosts (NPS, Parks Canada); those rows use path-qualified domains so each park can be crawled.

## Matcher

`npm run test:publications` — require an animal term **and** an attack term in title or snippet.

## Latest snapshot

Generated **2026-09-14T17:08:44.628Z**. Combined with the committed first-pass baseline plus this VM’s Canada / agency / wildlife-backfill wave.

| Metric | Count |
| --- | ---: |
| Publications in directory | 15,308 |
| Scanned at least once (combined) | **11,761** |
| This-VM pubs scanned | 5,390 |
| Uncrawled newspapers remaining | 6,446 |
| Article records fetched (combined) | **135,182** |
| This-VM articles | 40,001 |
| Matching articles (combined) | **1,049** |
| This-VM publication-linked incidents | 301 |
| New incidents this wave (beyond restored) | 0 |
| Publications with a match | 68 |
| Incidents from local / agency feeds (combined) | **188** |
| Canada publications (seeded / scanned) | **432 / 314** |
| Canada incidents (all / publication-linked) | **223 / 208** |
| Agency feeds (seeded / scanned) | 49 / 47 |
| Incidents total | 522 |

### Canada coverage (priority)

Bear / moose / cougar country first: YT, NT, NU, BC, AB, SK, MB, northern ON. Counts are live from this VM after the Canada-priority seed + crawl.

| Province / territory | Seeded | Scanned | Articles | Matches | Incidents |
| --- | ---: | ---: | ---: | ---: | ---: |
| YT Yukon | 6 | 6 | 99 | 10 | 17 |
| NT Northwest Territories | 11 | 11 | 448 | 40 | 69 |
| NU Nunavut | 3 | 3 | 140 | 15 | 4 |
| BC British Columbia | 88 | 88 | 2120 | 795 | 68 |
| AB Alberta | 43 | 42 | 475 | 20 | 31 |
| SK Saskatchewan | 16 | 16 | 241 | 32 | 8 |
| MB Manitoba | 17 | 17 | 331 | 55 | 10 |
| ON Ontario | 68 | 67 | 857 | 21 | 15 |
| QC Quebec | 24 | 8 | 28 | 0 | 0 |
| NB New Brunswick | 8 | 5 | 0 | 0 | 0 |
| NS Nova Scotia | 4 | 1 | 2 | 0 | 0 |
| NL Newfoundland and Labrador | 1 | 1 | 1 | 0 | 0 |
| PE Prince Edward Island | 1 | 0 | 0 | 0 | 0 |
| ??  | 142 | 49 | 330 | 0 | 0 |

**Canada totals:** 432 pubs seeded, 314 scanned, 5072 articles, 988 matcher hits, 208 publication-linked incidents (223 incidents with country=CA).

#### Recent / best Canada finds

- 'Handling me like a rag doll': Cranbrook hunter survives grizzly attack - CBC (bear, near_miss, Yellowknife, NT)
- 'Aggressive' black bear attacks 2 people near Simon Fraser University - CBC (bear, near_miss, Simon Fraser, NT)
- Wildfire fighter attacked by grizzly bear while on the job in northern B.C. - CBC (bear, near_miss, Yellowknife, NT)
- B.C. conservation officers put down 2 more cougars linked to dog attacks in Lower Mainland - CBC (mountain_lion, near_miss, Lower Mainland, NT)
- N.S. families say cougars attacked horses - CBC (mountain_lion, near_miss, Yellowknife, NT)
- 'There are cougars around': Attack a stark reminder for Alberta family - CBC (mountain_lion, near_miss, Yellowknife, AB)
- Cougar killed after attacking teen in Alberta national park - CBC (mountain_lion, fatal, Alberta, AB)
- Woman killed in bear attack in Alberta - CBC (bear, fatal, Alberta, AB)
- Fatal black bear attacks are extremely rare despite recent killings in Saskatchewan, experts say - CBC (bear, fatal, Saskatchewan, SK)
- 'Bruce' the pit bull survives cougar attack - CBC (mountain_lion, near_miss, Yellowknife, NT)
- Wildlife conflict specialist describes Jasper grizzly attack - CBC (bear, near_miss, Yellowknife, NT)
- Cougar attack thwarted by man with spear - CBC (mountain_lion, near_miss, Yellowknife, NT)
- 'It was grating my bones up': B.C. man narrowly survives grizzly attack - CBC (bear, near_miss, Yellowknife, NT)
- West Van dog recovering after backyard cougar attack - CBC (mountain_lion, near_miss, Yellowknife, NT)
- Black bear attacks on calves increasing in B.C.'s Cariboo region - CBC (bear, near_miss, Yellowknife, NT)
- Caution urged following fatal cougar attack - CBC (mountain_lion, fatal, Yellowknife, NT)
- Cougar attacks: Seven ways to survive - CBC (mountain_lion, near_miss, Yellowknife, NT)
- 2 cougars shot after child mauled in Lake Cowichan subdivision at centre of town - CBC (mountain_lion, near_miss, Lake Cowichan, NT)

### Incidents by country

- US: 292
- CA: 223
- NO: 10
- RU: 4
- JP: 2
- DE: 1
- SI: 1

### Incidents by source type

- news: 305
- ammoland: 205
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
| BC British Columbia | 88 | 2120 | 795 |
| NM New Mexico | 85 | 1330 | 2 |
| ID Idaho | 83 | 1764 | 2 |
| UT Utah | 81 | 1021 | 1 |
| WV West Virginia | 80 | 1141 | 0 |
| NV Nevada | 69 | 1312 | 1 |
| ON Ontario | 67 | 857 | 21 |
| NH New Hampshire | 63 | 836 | 0 |
| SD South Dakota | 61 | 1062 | 0 |
| DC District of Columbia | 58 | 397 | 0 |
| AK Alaska | 58 | 1252 | 6 |
| ND North Dakota | 55 | 688 | 0 |
| VT Vermont | 55 | 796 | 0 |
| HI Hawaii | 48 | 348 | 0 |
| WY Wyoming | 45 | 880 | 3 |
| AB Alberta | 42 | 475 | 20 |
| RI Rhode Island | 41 | 195 | 0 |
| DE Delaware | 38 | 223 | 0 |
| QC Quebec | 24 | 28 | 0 |
| MB Manitoba | 17 | 331 | 55 |
| SK Saskatchewan | 16 | 241 | 32 |
| NT Northwest Territories | 11 | 448 | 40 |
| NB New Brunswick | 8 | 0 | 0 |
| YT Yukon | 6 | 99 | 10 |
| NS Nova Scotia | 4 | 2 | 0 |
| NU Nunavut | 3 | 140 | 15 |
| NL Newfoundland and Labrador | 1 | 1 | 0 |
| PE Prince Edward Island | 1 | 0 | 0 |

### Local / agency incidents by species

- bear: 206
- mountain_lion: 81
- moose: 10
- elk: 4

### Local / agency incidents by region

- BC: 84
- NT: 69
- AB: 26
- AK: 22
- CO: 15
- ON: 14
- YT: 14
- MB: 13
- MT: 11
- WY: 10
- WA: 8
- SK: 8
- CA: 7
- VT: 7
- FL: 5
- ME: 5
- UT: 5
- NM: 4
- NU: 4
- ID: 3
- AR: 2
- IL: 2
- MN: 2
- PA: 2
- ??: 2
- NC: 1
- NV: 1
- NY: 1
- OK: 1
- TN: 1
- WI: 1
- NH: 1

