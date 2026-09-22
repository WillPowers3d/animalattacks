# Deploy (Vercel + Postgres)

One-click local demo is unchanged: `cp .env.example .env`, `npx prisma db push`, `npm run db:seed`, `npm run dev`.

Production needs a **hosted Postgres** URL. The GitHub Actions runner and Vercel serverless filesystem are ephemeral — do not treat `file:./dev.db` as the public ledger.

## Vercel

1. Import [WillPowers3d/animalattacks](https://github.com/WillPowers3d/animalattacks).
2. Framework preset: **Next.js**. Build command is already `prisma generate && next build` (`package.json` `build` + `postinstall`).
3. Environment variables (Project → Settings → Environment Variables):

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Postgres connection string, e.g. `postgresql://user:pass@host:5432/animalattacks?sslmode=require`. Neon / Supabase / Vercel Postgres all work. |
| `CRON_SECRET` | **yes** for cron | Vercel Cron sends `Authorization: Bearer $CRON_SECRET` to `/api/ingest` and `/api/publications/crawl`. |
| `INGEST_SECRET` | recommended | Alternate bearer for manual `POST /api/ingest` and `/api/publications/crawl`. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical public URL. |
| `OPENAI_API_KEY` | no | Optional LLM cleanup on ingest (`--enrich`). |
| `FACEBOOK_ACCESS_TOKEN` / `FACEBOOK_PAGE_IDS` | no | Optional public-page Graph ingest. Mock path if unset. |
| `FACEBOOK_GRAPH_VERSION` / `FACEBOOK_POST_LIMIT` | no | Defaults `v19.0` / `50`. |

4. After the first successful deploy, **once**:

```bash
npx tsx scripts/configure-db-provider.ts   # flips prisma provider to postgresql
npx prisma db push
npm run db:seed
```

`configure-db-provider.ts` reads `DATABASE_URL`. Run it in the same environment that has the production URL (or locally with that URL exported). Then seed Weingarten + publication directory + `crawl-progress.json`.

5. `vercel.json` schedules:

- `GET /api/ingest` daily at 12:00 UTC (Google News + optional Facebook)
- `GET /api/publications/crawl` daily at 13:30 UTC (incremental local / Canada / agency batch, `limit=40` unless you pass query flags)

Both routes reject unauthenticated production traffic unless `CRON_SECRET` or `INGEST_SECRET` matches.

## GitHub Actions (preferred for long crawls)

Repo secret: the same `DATABASE_URL`.

| Workflow | When |
| --- | --- |
| `.github/workflows/ingest.yml` | Daily 12:00 UTC + manual dispatch |
| `.github/workflows/crawl-publications.yml` | Daily incremental 13:30 UTC; weekly Sunday backfill; manual `country=CA` / `MX`, `wildlife`, `west`, `agencies` |
| `.github/workflows/digest.yml` | Weekly Monday 14:00 UTC fatal / injury markdown digest + artifact |

Vercel Cron is a short serverless burst. Use Actions (or a laptop) for `--backfill` / `npm run crawl:canada` / `npm run crawl:cbc`.

## Checklist

- [ ] Postgres `DATABASE_URL` on Vercel **and** GitHub Actions
- [ ] `CRON_SECRET` on Vercel
- [ ] Provider flipped + `prisma db push` + `db:seed` against that database
- [ ] Open `/` (map + All/US/Canada/Mexico toggle + coverage strip with US/CA/MX pub + incident counts) and `/data`
- [ ] Confirm source badges after seed (Weingarten / local paper / agency / Google News / Facebook)
- [ ] Optional: `npm run crawl:west-retry` then `npm run crawl:progress:export` to commit recovered Colorado archives
- [ ] Optional: `npm run crawl:mexico-extras` then `npm run crawl:progress:export` (southern jaguar-range extras only; does not re-walk first-pass Mexico)
- [ ] Optional: `npm run crawl:cbc` then `npm run crawl:progress:export` to commit new unique incidents
- [ ] Merge stack: PR #1 → #5, then this overnight PR. See [CHANGELOG.md](CHANGELOG.md).
