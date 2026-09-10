# animalattacks

North American animal attack tracker — news and social reports focused on bears, mountain lions, elk, and moose.

Public website that compiles **North American animal-attack incidents** into a browsable map, list, and stats ledger. Emphasis: **bears, mountain lions (cougars), elk, and moose**. Historical starter data is Dean Weingarten’s documented handgun defenses against bears, published on [Ammoland](https://www.ammoland.com/) and earlier on [Gun Watch](http://gunwatch.blogspot.com/).

This is **not official wildlife-agency data**.

## Features

- Incident database: species / subspecies, date, city–region–state/province, country (US / CA / MX), severity (fatal / injury / near-miss / property), summary, source URL(s), source type (news / facebook / ammoland / other), verified flag, lat/lng
- Defensive-firearm fields used in Weingarten’s research: `firearmType`, `caliber`, `shotsFired`, `defenseOutcome` (success / failure / indeterminate), `combinationDefense`
- Homepage map + list with filters (species, region, date, severity, firearm type / caliber)
- Incident detail pages with attribution
- Stats: species, region, yearly trend, **handgun caliber effectiveness**
- Full-text search
- About / methodology + disclaimer
- Daily ingest: Google News RSS + pluggable Facebook Graph API (mock if no token)

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

`npm run parse:weingarten` extracts dated cases into `data/weingarten-incidents.json`. Additional mountain lion / elk / moose incidents from public news and agency pages live in `data/extra-incidents.json`.

Parsing is heuristic. Weingarten’s published **98%** figure uses *his* inclusion rules (handgun actually fired; combination cases excluded from the rate). This site stores combination cases with `combinationDefense=true` and shows caliber breakdowns only where we extracted a caliber.

Chuke’s Outdoors and others cite this same public database; we attribute the research to **Dean Weingarten / Ammoland**.

## Daily ingest

```bash
npm run ingest          # write upserts
npm run ingest:dry      # fetch + parse, no writes
# optional flags: --no-facebook  --enrich
```

- **News:** Google News RSS queries for NA bear / cougar / elk / moose attacks.
- **Facebook:** If `FACEBOOK_ACCESS_TOKEN` and `FACEBOOK_PAGE_IDS` (comma-separated) are set, posts are pulled from Graph API `/{page-id}/posts`. Otherwise a **mock/stub** path runs so the pipeline is testable.
- **Dedupe:** canonical URL, then title + date + location.
- **Parse:** keyword heuristics. Set `OPENAI_API_KEY` and pass `--enrich` (or set the key for `/api/ingest`) for optional LLM field cleanup.
- **HTTP:** `POST /api/ingest` (protect with `INGEST_SECRET` Bearer token or `?secret=`).

### GitHub Action

`.github/workflows/ingest.yml` runs daily at 12:15 UTC (`workflow_dispatch` available). Add repo secrets as needed:

- `DATABASE_URL` (Postgres in production; SQLite is only for local / CI smoke)
- `OPENAI_API_KEY` (optional)
- `FACEBOOK_ACCESS_TOKEN` / `FACEBOOK_PAGE_IDS` (optional)

### Vercel Cron

`vercel.json` hits `/api/ingest` daily. Set `INGEST_SECRET` and a production `DATABASE_URL` (Postgres). Switch Prisma `provider` to `postgresql` for hosted Postgres — field types are already compatible.

### Facebook token setup

1. Create a Meta app with **pages_read_engagement** (and a Page token you are allowed to use).
2. Collect numeric Page IDs for public pages that post wildlife-conflict reports.
3. Put the long-lived Page token in `FACEBOOK_ACCESS_TOKEN` and IDs in `FACEBOOK_PAGE_IDS`.
4. Without those env vars, ingest still runs using two clearly labeled mock posts.

## Postgres

Local default is SQLite (`DATABASE_URL="file:./dev.db"`). For Postgres:

1. Change `provider = "postgresql"` in `prisma/schema.prisma`.
2. Set `DATABASE_URL`.
3. `npx prisma db push` (or migrate) and `npm run db:seed`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync Prisma schema |
| `npm run db:seed` | Load Weingarten + extra JSON |
| `npm run db:reset` | Recreate DB + seed |
| `npm run parse:weingarten` | Re-parse `data/sources/` |
| `npm run ingest` / `ingest:dry` | News + Facebook pipeline |

## License / ethics

Incident text is summarized from public news and Weingarten’s published lists for research/index use. Read the originals. Do not treat caliber charts as a recommendation to carry or use a firearm.
