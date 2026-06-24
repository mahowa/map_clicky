# 4. Cron & runtime retrieval

[← Daily selection](03-selection.md) · [Wiki home](README.md) · Next: [Data model →](05-data-model.md)

Two moments matter at runtime: **generation** (a scheduled job builds the day) and
**retrieval** (a player loads the game). They're decoupled — generation writes a
`daily-sets` row; retrieval reads it, with fallbacks so the game is always playable even if
generation never ran.

## Generation: the daily cron

`src/app/(payload)/api/cron/daily/route.ts` is a `GET` endpoint triggered by **Vercel
Cron**. From `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/daily", "schedule": "5 0 * * *" }] }
```

So it runs at **00:05 UTC** every day. The handler:

1. **Auth** — if `CRON_SECRET` is set, requires `Authorization: Bearer <secret>`; otherwise
   401. Vercel sends this header automatically.
2. **Ingest first** — calls `ingestOnThisDay(today)` so the generator can use today's
   events. A feed failure is **caught and swallowed** into the response — it must not block
   the daily, which then just falls back to population selection.
3. **Generate** — calls `getOrCreateDailySet(today)`.
4. Returns the generation result plus the ingest summary as JSON.

`today` is `new Date().toISOString().slice(0, 10)` — the UTC date. `maxDuration = 120`s and
`dynamic = 'force-dynamic'` so it always runs fresh.

Because both ingest and generation are idempotent, a retry (or a manual hit) on the same day
is safe.

## Retrieval: serving the game

`getDailyRun(now)` in `src/lib/rounds.ts` is what the game calls to build a playable run. It
resolves in three tiers:

1. **Today's set** — find the `daily-sets` row whose `date` falls in today's UTC bounds
   (`utcDayBounds`). Map its rounds to playable `Round`s (`mode: 'daily'`).
2. **Most recent set** — if today's row doesn't exist yet, fall back to the latest
   `daily-sets` row (`sort: '-date'`). Still `mode: 'daily'`.
3. **Practice** — if there are *no* daily sets at all, grab any 5 locations
   (`mode: 'practice'`, `dateKey: ''`). Practice never locks.

For each round, the displayed post-guess fact prefers the **event blurb** that selected the
place, falling back to the location's own `facts[0]` (`rounds.ts:24`):

```ts
fact: (event && event.trim()) || locFact,
```

## Why the day is keyed in UTC

Both generation (`getOrCreateDailySet`, `dayBounds`) and retrieval (`utcDayBounds`) compute
day boundaries as `YYYY-MM-DDT00:00:00.000Z` → +24h. Everyone worldwide gets the same daily
on the same UTC date, and `daily-sets.date` is `unique`, enforcing one set per day.

## Key files

- `src/app/(payload)/api/cron/daily/route.ts` — the scheduled generation endpoint.
- `vercel.json` — the cron schedule (00:05 UTC).
- `src/lib/rounds.ts` — `getDailyRun`, `utcDayBounds`, the fallback chain.
- `src/lib/daily-generator.ts` — `getOrCreateDailySet`, `dayBounds`.
