# 6. Operations & scripts

[← Data model](05-data-model.md) · [Wiki home](README.md)

Day-to-day commands for filling the library, ingesting events, generating/backfilling
dailies, and testing the pipeline. All scripts read `.env` and run via `tsx`.

## One-time / occasional: fill the library

```bash
# Import cities from GeoNames (downloads cities15000 + countryInfo)
pnpm exec tsx scripts/import-geonames.ts                  # top 1000 cities, min pop 100k
pnpm exec tsx scripts/import-geonames.ts --limit 5000 --min-pop 50000
pnpm exec tsx scripts/import-geonames.ts --file ./cities15000.txt   # use a local TSV
```

Idempotent on `geonameId` — re-running only adds new cities. See
[Sourcing](01-sourcing.md).

```bash
# Tiny hand-written dev seed: admin user + 5 capitals + a practice set + today's daily
pnpm exec tsx scripts/seed.ts
```

> `scripts/seed.ts` is for getting a fresh local DB playable fast. Default admin login is
> `admin@mapclippy.test` / `changeme123`. It skips if locations already exist.

## Daily: ingest events

```bash
pnpm exec tsx scripts/ingest-news.ts                 # today (UTC)
pnpm exec tsx scripts/ingest-news.ts --date 2026-06-24
pnpm exec tsx scripts/ingest-news.ts --days 7        # 7 days from --date/today
```

Fetches Wikipedia "On this day", matches places, upserts `news-items`. Idempotent on
`sourceId`. See [On This Day ingest](02-on-this-day-ingest.md).

## Daily: generate the set

```bash
pnpm exec tsx scripts/generate-daily.ts              # today (UTC)
pnpm exec tsx scripts/generate-daily.ts --date 2026-06-23
pnpm exec tsx scripts/generate-daily.ts --days 7     # backfill a week
pnpm exec tsx scripts/generate-daily.ts --date 2026-06-24 --force   # delete + regenerate
```

`--force` deletes any existing set for that day first; without it, an existing day is
skipped (generation is otherwise idempotent). See [Daily selection](03-selection.md).

> **Order matters.** Ingest *before* generate for a given day, or the generator sees no
> news and falls back to population selection. The production cron does ingest→generate in
> that order automatically.

## In production

You normally run **nothing** by hand — Vercel Cron hits `/api/cron/daily` at **00:05 UTC**,
which ingests then generates today. See [Cron & runtime](04-cron-and-runtime.md). Use the
scripts above for backfills, local dev, or recovering a missed/broken day with `--force`.

To manually trigger production generation, `GET /api/cron/daily` with
`Authorization: Bearer $CRON_SECRET`.

## Testing

```bash
pnpm run test:int     # vitest unit/integration
pnpm run test         # int + e2e (playwright)
```

The selection and matching logic is deliberately **pure** (no DB, no clock, no
`Math.random`) so it's unit-testable offline:

- `selectRounds` (`src/lib/daily-generator.ts`) — feed it pools/used/news, assert the picks.
- `seededRng` / `shuffle` (`src/lib/rng.ts`) — determinism.
- `parseOnThisDay` (`src/lib/news/source.ts`) — JSON → events, no network.
- `matchEventToLocationIds` / `normalizeName` (`src/lib/news/match-places.ts`) — matching.

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| Daily has no "On this day" blurbs | Ingest didn't run before generate, feed was down, or nothing matched. Run `ingest-news.ts` for the day, then `generate-daily.ts --force`. |
| `Skipped <date>: already exists` | A set exists. Use `--force` to regenerate. |
| `Skipped <date>: no locations in pool` | The `locations` library is empty for a needed difficulty. Run the GeoNames import. |
| Same places repeat too often | Library too small relative to the 30-day `AVOID_RECENT_DAYS` window — import more cities. |
| Cron returns 401 | `CRON_SECRET` mismatch between Vercel and the request. |
