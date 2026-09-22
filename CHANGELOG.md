# Changelog

Features shipped across the stacked PRs. Merge order: **#1 → #5**, then this overnight PR.

## PR #1 — US local-news directory + crawler

- Seeded `data/publications/us-local-news.json.gz` (~14.8k unique US outlets) from open directory sources.
- `Publication` table, robots-aware progressive crawler (RSS → sitemaps → site search).
- High-precision matcher: animal term **and** attack term required.
- Homepage map, filters, CSV export, daily Google News ingest.

## PR #2 — Leftover + unstated sweep

- Finished first-pass RSS on leftover / domain-only US newspapers (~11,325 scanned).
- Checkpointed `crawl-progress.json` so a new VM can resume without starting over.
- Matcher tightening for sports / legal “charged” noise.

## PR #3 — Canada, agencies, wildlife backfill

- Curated Canadian local-news directory + CBC / Radio-Canada / territorial extras.
- 49 official wildlife-agency / park press feeds (`sourceType=agency`).
- Wildlife-state archive `--backfill` (skips `lastBackfillAt`, does not redo the RSS first pass).
- French matcher (`ours` / `orignal` / `couguar` + `attaque`).

## PR #4 — CBC ingest, reprint dedupe, deploy polish

- CBC via `rss.cbc.ca` over HTTP/1.1 after HTTP/2 stall.
- Cross-URL event dedupe for reprint farms (Bella Coola school-group wire 19→1).
- `DEPLOY.md` + country toggle / source badges (Weingarten / local paper / agency / Google News / Facebook).

## PR #5 — Mexico, west-core, fatal/injury digest

- Mexican directory (199 pubs) + Spanish matcher + `country=MX` map filter.
- Deep western-core archive backfill for **AK / MT / WY / ID / CO** (`--west --backfill`).
- Weekly fatal / injury digest (`npm run digest`, `/api/digest`, Monday Action + Vercel cron).
- 150 west pubs scanned; **165 Colorado** still queued (timeouts / dead hosts).

## Unreleased — overnight (this PR, stacked on #5)

- **West-core retry:** DNS dead-host probe, `--skip-dead`, `--timeout-ms` (300s), `--uncrawled`, `npm run crawl:west-retry` (concurrency 2). Mid-wave: 17 CO pubs finished, **13** new unique incidents (Denver Post + Red Feather Lakes + Collegian / Herald Times / South Platte), 9× `pub-timeout-300s`. Ledger 614 → 629. Does not redo finished US/CA/MX first-pass or completed AK/MT/WY/ID archives.
- **Facebook Graph ingest:** pluggable `createFacebookFetcher()` — live `/{page-id}/posts` when `FACEBOOK_ACCESS_TOKEN` + `FACEBOOK_PAGE_IDS` are set; labeled mock path otherwise. Attack keyword filter uses the newspaper matcher. Pagination + `FACEBOOK_GRAPH_VERSION` / `FACEBOOK_POST_LIMIT`.
- **Product:** homepage coverage strip shows US/CA/MX **incident + publication** counts; digest `--fatal-only` / `?severity=fatal`.
- **Hygiene:** `npm test` (matcher, dedupe, Facebook, digest, dead-host), `CHANGELOG.md`, README / DEPLOY / `.env.example` for the full stack.
- **If-time extras:** 12 southern jaguar-range papers (TAB / VER / CHP / OAX / CAM) in `extra.json`; CONANP / PROFEPA / SEMARNAT agency rows. New rows only — first-pass Mexico directory not rebuilt.
