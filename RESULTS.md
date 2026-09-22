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

| | After Canada-priority (PR #3) | After dedupe + CBC (PR #4) | After Mexico + west + digest (PR #5) | Overnight (this PR) |
| --- | ---: | ---: | ---: | ---: |
| Directory rows | **15,308** | **15,308** | **15,491** (+199 MX) | **+12** southern MX extras + **3** MX agency rows (no US/CA/MX first-pass rebuild) |
| US pubs scanned (RSS first pass) | **11,325** | **11,325** | **11,325** (not re-scanned) | not re-scanned |
| Canada pubs seeded / scanned | **432 / 314** | **432 / 314** + **14** CBC | **432 / 314** (not re-crawled) | not re-crawled |
| Mexico pubs seeded / scanned | — | — | **199 / 197** (2,572 articles, 31 matcher hits, 28 upserts; 3 reprints merged) | **212** seeded / **210** scanned (10 extras + 3 MX agencies). Extras: **103** articles, **0** new wildlife uniques. **elsoldeoaxaca.com.mx** dead-host; **imagendelgolfo.mx** robots-blocked. Epoch Times `.jp/.ru` skipped by TLD filter. First-pass MX not re-walked. |
| Mexico incidents (`country=MX`) | — | — | **34** on the map / `/data` after Durango-CO retags (Mexican papers also reprinted some world wires) | **34** (soccer “Ataque Puma queda en evidencia” matched then dropped; `/deportes/` + Liga MX Pumas rejected) |
| West-core archive backfill (AK/MT/WY/ID/CO) | skipped | skipped | **150** never-backfilled pubs scanned this wave (757 articles, **10** new unique incidents). **165** still queued (mostly 150s timeouts / dead hosts). Already-backfilled western papers were not re-walked. | **48** completed / **41** `pub-timeout-300s` / **0** dead hosts / **25** new unique. Ledger **614 → 641**. CO newspapers lastBackfill **123**; **117** still never-backfilled (retryable timeouts). Lamar Ledger added Coal Creek + Boulder moose. CPR / Kiowa / KRDO completed (mostly reprints). West-retry **stopped 17:03 UTC** after 4h budget. AK/MT/WY/ID not re-walked. |
| Agency feeds seeded / scanned | **49 / 47** | **49 / 47** | **49 / 47** | **52 / 52** refreshed (1,058 articles, 29 matches, **17** new). CONANP / PROFEPA / SEMARNAT crawled (thin gob.mx pages, 0 matches). CPW recovered Aspen / Steamboat / Boulder / Durango / Estes official wires. |
| Fatal / injury digest | — | — | `npm run digest` + weekly Action; first-run window uses `occurredAt` (not the whole seeded corpus) | `--fatal-only` / `?severity=fatal` |
| Facebook Graph | mock stub | mock stub | mock stub | pluggable live Graph + matcher filter; mock if no token |
| Incidents total in this VM | **487** | **522** | **614** | **658** (+44; 25 paper uniques + 17 agency) |
| Historical Weingarten | 205–231 | **205** ammoland | **205** ammoland (unchanged) | **205** ammoland (unchanged) |

### Best finds this wave

**CBC (this PR):** Whistler / Anmore back-deck maulings; Bella Coola school-group wire now one pin; Red Lake, ON fatal; Dawson City campground; Water Valley / Calgary-area grizzlies; Nunavut polar-bear survivor; Coquitlam rescue; B.C. hunter hospitalized. Regional RSS (`rss.cbc.ca`) is live again.

**Canada (priority, prior wave):** Mayo, YT woman and 10-month-old killed; Tulita, NT musician killed; Hay River, NT child injured; Iqaluit-area worker killed by polar bear; Sanirajak / Naujaat / Auyuittuq polar-bear attacks; Fort Frances / Kenora / Armstrong, ON black-bear injuries; Bella Coola school-group grizzly; Maple Ridge / Anmore / Squamish / Whistler / Vanderhoof / Pemberton / Shuswap; Rocky Mountain House and Banff-area cougars; Jasper / Waterton grizzlies; Prince Albert NP mother/son; Buffalo Narrows, SK; Shamattawa, MB. French Radio-Canada / territorial weeklies now match `ours` / `orignal` / `couguar` + `attaque`.

**Agency (overnight refresh):** **52 / 52** feeds, **1,058** articles, **17** new. CPW: Aspen bear (two-day follow-up); Boulder County moose vs dog-walker; Durango-area sheepherder; Steamboat / Eagle County bears; Estes Park third cow-elk charge; Larimer County suspected fatal mountain lion; Jefferson County angler. WDFW Stevens County child + elk-hunter cougar wires remain. CONANP / PROFEPA / SEMARNAT answered but had no matcher hits.

**US archive backfill:** Yellowstone hiker injuries; Grizzly 399 / Lander; Glacier NP fatal; Ovando cyclist; Big Sky hunter; Columbia Falls; Cody hunter.

**Mexico (this PR):** Coahuila livestock / crop black-bear and puma conflict (El Heraldo de Saltillo); Tamaulipas farmers who killed an attacking puma; Chiapas La Concordia child puma attack; Oaxaca Mazatec child killed by puma; Nuevo León bear walking through a party (no injuries). Northern papers also reprint world wires (Japón, Italia, Brasil) — country inference now keys off Japón/Brasil/Noruega and does not apply Mexican state names to US publications (Durango, CO stays US).

**West-core backfill (PR #5):** Colorado Sun / KJCT Eagle County deputy vs charging bear; Grand Junction child bear attack follow-ups; Kiowa County Press mountain-lion investigation; Aspen camper fights off a bear; Colorado Springs bear attack. Matcher still rejects sports/legal “charged” noise; a few circus-bear wires from bilingual CO papers remain.

**Overnight west-retry (this PR, closed 17:03 UTC):** Remaining queued western-core pubs were **Colorado only**. `--timeout-ms=300000 --concurrency=2 --skip-dead`. Wall-clock watchdog + 60s heartbeat. Restart wave printed **25/80 · 2,030 articles · 38 matches · 5 upserts**, then continued past the 4h wave budget until SIGTERM at 17:03. Dead-host DNS probe: **0** skipped.

Recovered unique incidents this run (**25**):

- Denver Post: Winter Park moose; Estes Park / Aspen / drought-year bears
- North Forty News: Red Feather Lakes CPW search
- Collegian / Herald Times / South Platte / Akron: Rocky Mountain bear-conflict wires
- **Gazette:** Steamboat Springs 8th bear attack; Estes Park woman; Teller County moose; Telluride elk charge; moose vs girlfriend; southern-Colorado tent bite; Montana grizzly wire (landmark → MT)
- **Greeley Tribune:** trail-runner mountain-lion attack; “Proving Cougars Attack the Weak” (matcher still noisy on opinion wires)
- **Lamar Ledger:** Coal Creek Canyon moose injury; Boulder County deputy kills moose after two hikers and a dog were injured (city wrongly pinned to Prowers)
- Daily Camera (9) / Vail Daily (2) / EP Trail (11) / CPR (3) / Kiowa (4) / KRDO (6): reprints of the Gazette / Greeley set

Completed (**48** CO lastBackfill after 07:00 UTC), including **cpr.org**, **kiowacountypress.net**, **krdo.com**, **lamarledger.com**. Timeouts (**41** `pub-timeout-300s`; leftover `nps.gov/romo` 45s). Mid-batch at stop: lonetreevoice.net / longmontmagazine.com marked timeout. **117** CO newspapers still never-backfilled — retryable, not a first-pass redo.

Landmark retag: Glacier NP reprints → MT; Steamboat Springs / Telluride stay in the right Colorado towns.

Priority order: AK, MT, WY, ID, CO, WA, OR, CA, AZ, NM, UT, NV, ME, MN, WI, MI, NH, VT, NY, PA, TN, NC, VA, WV, SD, ND, FL, then remaining black-bear / cougar-range states (TX, OK, AR, GA, KY, MO, IA, KS, NE, LA, AL, SC, MS, OH, IN, IL), then coastal leftovers and unstated domains.

**This continuation** does **not** re-scan the US first pass or re-litigate the Canada / Mexico first-pass directories. New workstreams:

1. **Finish west-core queue** — retry pass **closed 17:03 UTC**. 48 completed / 41 timeouts / 25 uniques / ledger 641. 117 CO newspapers remain never-backfilled (timeouts), not re-queued this wave.
2. **Facebook / Meta public-page ingest** — `createFacebookFetcher()` Graph path + mock fallback + attack keyword filter.
3. **Digest fatal-only** + homepage coverage strip (US/CA/MX pub + incident counts).
4. **Southern Mexico extras** — **done.** 10 uncrawled TAB/VER/CHP/OAX/CAM papers scanned; 0 new jaguar/black-bear uniques. Matcher now drops Liga MX / `/deportes/` “Ataque Puma” sports wires.
5. **Agency refresh** — **done.** 52/52 including CONANP / PROFEPA / SEMARNAT. Ledger **641 → 658**.

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

# Leftover west queue (CO timeouts / dead hosts) — longer timeout, lower concurrency
npm run crawl:west-retry

# New Mexico extras only (does not re-walk first-pass MX)
npm run crawl:mexico-extras

# Fatal / injury markdown digest (optional --fatal-only)
npm run digest
npm run digest -- --fatal-only --stdout

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

Generated **2026-09-22T17:23:31.829Z**. Combined with the committed first-pass baseline plus Mexico / west-core plus this overnight west-retry / Facebook / digest wave.

| Metric | Count |
| --- | ---: |
| Publications in directory | 15,504 |
| Scanned at least once (combined) | **11,903** |
| This-VM pubs scanned | 5,753 |
| Uncrawled newspapers remaining | 6,281 |
| Article records fetched (combined) | **140,199** |
| This-VM articles | 49,983 |
| Matching articles (combined) | **1,214** |
| This-VM publication-linked incidents | 441 |
| New incidents this wave (beyond restored) | 0 |
| Publications with a match | 104 |
| Incidents from local / agency feeds (combined) | **302** |
| Canada publications (seeded / scanned) | **432 / 316** |
| Canada incidents (all / publication-linked) | **224 / 210** |
| Mexico publications (seeded / scanned) | **212 / 210** |
| Mexico incidents (all / publication-linked) | **34 / 34** |
| Agency feeds (seeded / scanned) | 52 / 52 |
| Incidents total | 658 |

### Canada coverage (priority)

Bear / moose / cougar country first: YT, NT, NU, BC, AB, SK, MB, northern ON. Counts are live from this VM after the Canada-priority seed + crawl.

| Province / territory | Seeded | Scanned | Articles | Matches | Incidents |
| --- | ---: | ---: | ---: | ---: | ---: |
| YT Yukon | 6 | 6 | 99 | 10 | 18 |
| NT Northwest Territories | 11 | 11 | 448 | 40 | 69 |
| NU Nunavut | 3 | 3 | 140 | 15 | 4 |
| BC British Columbia | 88 | 88 | 2120 | 795 | 68 |
| AB Alberta | 43 | 43 | 476 | 20 | 31 |
| SK Saskatchewan | 16 | 16 | 241 | 32 | 8 |
| MB Manitoba | 17 | 17 | 331 | 55 | 10 |
| ON Ontario | 68 | 68 | 858 | 21 | 15 |
| QC Quebec | 24 | 8 | 28 | 0 | 0 |
| NB New Brunswick | 8 | 5 | 0 | 0 | 0 |
| NS Nova Scotia | 4 | 1 | 2 | 0 | 0 |
| NL Newfoundland and Labrador | 1 | 1 | 1 | 0 | 0 |
| PE Prince Edward Island | 1 | 0 | 0 | 0 | 0 |
| ??  | 142 | 49 | 330 | 0 | 0 |

**Canada totals:** 432 pubs seeded, 316 scanned, 5074 articles, 988 matcher hits, 210 publication-linked incidents (224 incidents with country=CA).

#### Recent / best Canada finds

- Mientras el esposo cazaba osos, uno de ellos mató a su esposa y bebé (bear, near_miss, YT)
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

### Mexico coverage (new)

Northern states + jaguar / black-bear range: SON, CHH, COA, NLE, BCN, BCS, then SIN / DUR / TAM and Pacific / southeast jaguar states. Moose N/A; elk rare. Spanish matcher: oso / puma / león de montaña + atacó / ataque / agredió / embistió.

| State | Seeded | Scanned | Articles | Matches | Incidents |
| --- | ---: | ---: | ---: | ---: | ---: |
| SON Sonora | 7 | 7 | 142 | 0 | 0 |
| CHH Chihuahua | 12 | 12 | 138 | 2 | 3 |
| COA Coahuila | 8 | 8 | 134 | 0 | 4 |
| NLE Nuevo León | 13 | 13 | 185 | 0 | 1 |
| BCN Baja California | 10 | 10 | 198 | 0 | 0 |
| BCS Baja California Sur | 6 | 6 | 54 | 0 | 0 |
| SIN Sinaloa | 8 | 8 | 59 | 0 | 0 |
| DUR Durango | 3 | 3 | 54 | 0 | 1 |
| TAM Tamaulipas | 6 | 6 | 64 | 0 | 1 |
| JAL Jalisco | 6 | 6 | 147 | 0 | 0 |
| NAY Nayarit | 3 | 3 | 0 | 0 | 1 |
| MIC Michoacán | 8 | 8 | 28 | 0 | 4 |
| GRO Guerrero | 4 | 4 | 3 | 0 | 0 |
| OAX Oaxaca | 5 | 5 | 81 | 0 | 2 |
| CHP Chiapas | 8 | 8 | 176 | 2 | 1 |
| TAB Tabasco | 3 | 3 | 50 | 0 | 0 |
| VER Veracruz | 3 | 3 | 0 | 0 | 0 |
| CAM Campeche | 5 | 5 | 34 | 1 | 1 |
| ROO Quintana Roo | 5 | 5 | 122 | 0 | 0 |
| YUC Yucatán | 5 | 5 | 63 | 0 | 0 |
| ZAC Zacatecas | 4 | 4 | 30 | 0 | 0 |
| SLP San Luis Potosí | 3 | 3 | 10 | 0 | 0 |
| CMX Ciudad de México | 5 | 5 | 24 | 0 | 0 |
| ??  | 72 | 70 | 1026 | 27 | 15 |

**Mexico totals:** 212 pubs seeded, 210 scanned, 2822 articles, 32 matcher hits, 34 publication-linked incidents (34 incidents with country=MX).

#### Recent / best Mexico finds

- Durango Woman Found Dead After Apparent Bear Attack (bear, fatal, Archuleta, DUR)
- Puma ataca a campesinos, ellos lo enfrentan y lo matan en Tamaulipas (mountain_lion, near_miss, Coatzacoalcos, TAM)
- Mujer de 90 años sobrevive a ataque de un oso: “He estado alabando al Señor desde entonces” (bear, near_miss, Coatzacoalcos)
- El caso del niño que peleó con un puma y sobrevivió (mountain_lion, near_miss)
- Oaxaca: Crece la depredación de ganado por felinos y fauna silvestre (mountain_lion, property, OAX)
- Mueren dos venados en Actopan, uno por ataque de puma (mountain_lion, near_miss)
- Niño de 4 años logra sobrevivir al ataque de un puma en las montañas (mountain_lion, near_miss)
- Despedazan a hija de “El Puma” por sus fotos en bikini (mountain_lion, near_miss)
- Oaxaca Ataca puma a niño. Niño mazateco muere tras ser atacado por puma (mountain_lion, near_miss, OAX)
- En Actopan, sin registro de ataques de pumas a ganado: alcaldesa (mountain_lion, property)
- Gritos descarnados alertaron a papás: Niña de 3 años es arrastrada y mordida por puma; perdió brazo (mountain_lion, near_miss, CHH)
- Dylan McWilliams, el joven que sobrevivió a un tiburón, un oso y una serpiente de cascabel (bear, near_miss)
- Intenta tomarse selfie con oso y resulta mortal (bear, fatal)
- Noruega: Matan a oso polar que atacó e hirió a guardia en la cabeza (bear, near_miss)
- VIDEO. Mamá osa ataca un auto en marcha para defender a su cría (bear, near_miss)
- VIDEO Nuevo León Sorprende oso en fiesta. Sorprende oso en fiesta, no ataca a nadie, pero se come todo (bear, near_miss, NLE)
- Oso se mete a casa y mata a la mascota de la familia: un borrego (bear, near_miss)
- VIDEO. Oso se mete hasta la cocina y ataca a un hombre (bear, near_miss)

### Incidents by country

- US: 382
- CA: 224
- MX: 40
- NO: 10
- RU: 4
- JP: 2
- DE: 1
- SI: 1

### Incidents by source type

- news: 425
- ammoland: 205
- agency: 24
- other: 5

### Coverage by state / province (scanned publications)

| Region | Scanned | Articles | Matches |
| --- | ---: | ---: | ---: |
| ??  | 2041 | 22396 | 27 |
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
| CO Colorado | 240 | 6341 | 139 |
| PA Pennsylvania | 240 | 4602 | 4 |
| WA Washington | 224 | 2675 | 5 |
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
| ON Ontario | 68 | 858 | 21 |
| NH New Hampshire | 63 | 836 | 0 |
| SD South Dakota | 61 | 1062 | 0 |
| DC District of Columbia | 58 | 438 | 0 |
| AK Alaska | 58 | 1252 | 6 |
| ND North Dakota | 55 | 688 | 0 |
| VT Vermont | 55 | 796 | 0 |
| HI Hawaii | 48 | 348 | 0 |
| WY Wyoming | 45 | 880 | 3 |
| AB Alberta | 43 | 476 | 20 |
| RI Rhode Island | 41 | 195 | 0 |
| DE Delaware | 38 | 223 | 0 |
| QC Quebec | 24 | 28 | 0 |
| MB Manitoba | 17 | 331 | 55 |
| SK Saskatchewan | 16 | 241 | 32 |
| NLE Nuevo León | 13 | 185 | 0 |
| CHH Chihuahua | 12 | 138 | 2 |
| NT Northwest Territories | 11 | 448 | 40 |
| BCN Baja California | 10 | 198 | 0 |
| NB New Brunswick | 8 | 0 | 0 |
| COA Coahuila | 8 | 134 | 0 |
| MIC Michoacán | 8 | 28 | 0 |
| SIN Sinaloa | 8 | 59 | 0 |
| CHP Chiapas | 8 | 176 | 2 |
| SON Sonora | 7 | 142 | 0 |
| YT Yukon | 6 | 99 | 10 |
| BCS Baja California Sur | 6 | 54 | 0 |
| JAL Jalisco | 6 | 147 | 0 |
| TAM Tamaulipas | 6 | 64 | 0 |
| ROO Quintana Roo | 5 | 122 | 0 |
| YUC Yucatán | 5 | 63 | 0 |
| CAM Campeche | 5 | 34 | 1 |
| OAX Oaxaca | 5 | 81 | 0 |
| CMX Ciudad de México | 5 | 24 | 0 |
| NS Nova Scotia | 4 | 2 | 0 |
| GRO Guerrero | 4 | 3 | 0 |
| ZAC Zacatecas | 4 | 30 | 0 |
| NU Nunavut | 3 | 140 | 15 |
| DUR Durango | 3 | 54 | 0 |
| NAY Nayarit | 3 | 0 | 0 |
| SLP San Luis Potosí | 3 | 10 | 0 |
| TAB Tabasco | 3 | 50 | 0 |
| VER Veracruz | 3 | 0 | 0 |
| NL Newfoundland and Labrador | 1 | 1 | 0 |
| PE Prince Edward Island | 1 | 0 | 0 |

### Local / agency incidents by species

- bear: 296
- mountain_lion: 106
- moose: 31
- elk: 8

### Local / agency incidents by region

- CO: 106
- BC: 84
- NT: 69
- AB: 27
- AK: 23
- ??: 17
- MT: 15
- YT: 15
- ON: 14
- MB: 13
- WY: 10
- WA: 8
- SK: 8
- CA: 7
- VT: 7
- DUR: 7
- FL: 5
- NM: 5
- ME: 5
- UT: 5
- NU: 4
- COA: 4
- MIC: 4
- ID: 3
- CHH: 3
- AR: 2
- IL: 2
- MN: 2
- PA: 2
- CHP: 2
- OAX: 2
- NC: 1
- NV: 1
- NY: 1
- OK: 1
- TN: 1
- WI: 1
- NH: 1
- CAM: 1
- IN: 1
- NAY: 1
- NLE: 1
- TAM: 1

