# 3. Daily selection algorithm

[← On This Day ingest](02-on-this-day-ingest.md) · [Wiki home](README.md) · Next: [Cron & runtime →](04-cron-and-runtime.md)

This is the heart of "today's POI": the deterministic algorithm that turns a date into five
rounds. It lives in `src/lib/daily-generator.ts`.

## Guarantees

- **Deterministic** — the same date + same location pool always yields the same five rounds.
  The RNG is seeded from the date string, so there's no `Math.random` or wall-clock
  involved in the pick itself.
- **News-first, with safe fallback** — today's matched events are preferred, but an empty
  news set collapses to byte-identical legacy population-based ordering.
- **Difficulty ramp** — every day is `easy, easy, medium, hard, hard` (`ROUND_DIFFICULTIES`),
  mirroring MapTap. Difficulty drives the score multiplier.
- **No recent repeats** — places used in the last **30 days** (`AVOID_RECENT_DAYS`) are
  avoided when possible.

## The seed & RNG

The seed is just the **ISO date string** (`YYYY-MM-DD`, UTC). `src/lib/rng.ts` turns it into
a pure PRNG:

```ts
hashString(seed)   // xfnv1a → 32-bit uint
  → mulberry32(..)  // fast seeded PRNG, floats in [0,1)
  → shuffle(...)     // Fisher–Yates using that PRNG
```

Pools are read **sorted by `id`** (`poolForDifficulty`, `daily-generator.ts:27`) so the
input order is stable before shuffling — the determinism depends on it.

## Inputs to `selectRounds`

`getOrCreateDailySet` gathers three things before selecting:

1. **`pools`** — up to 1000 location ids per difficulty (`POOL_LIMIT`), id-sorted.
2. **`used`** — location ids that appeared in any daily in the previous 30 days.
3. **`news`** — today's matched locations (see [§ News input](#news-input)).

<a name="news-input"></a>
### News input

`newsForDay(payload, dateStr)` reads the `news-items` rows whose `calendarDay` equals
today's MM-DD, sorted by `sourceId` (stable, so "first event wins" is deterministic), and
returns:

- **`candidateIds`** — every location id referenced by today's events.
- **`eventByLocation`** — location id → the first event blurb that selected it.

Empty sets here (nothing ingested / matched) ⇒ pure population fallback.

## The picker

`selectRounds` (`daily-generator.ts:89`) shuffles each difficulty pool with the seeded RNG,
then fills the ramp. For each slot it calls `take(difficulty)`, which scans that
difficulty's shuffled pool in a strict preference order:

```
1. news-matched AND not used recently
2. news-matched (even if used recently)
3. not used recently
4. anything left in this difficulty
   ── last resort, any difficulty ──
5. news-matched in any difficulty
6. anything not yet chosen
```

With **no news**, steps 1–2 and 5 are empty, so the picker collapses to "not-recently-used,
else anything" — the legacy behavior. The chosen id is marked so it can't repeat within the
day, and if a matched event exists for it, the event blurb is attached to the round:

```ts
const event = news.eventByLocation.get(id)
rounds.push(event ? { location: id, difficulty, event } : { location: id, difficulty })
```

The last-resort cross-difficulty steps (5–6) only fire when a difficulty pool is exhausted
— they keep the game playable on a thin library rather than producing fewer than five
rounds.

## Persisting the day

Back in `getOrCreateDailySet` (`daily-generator.ts:130`):

- If a `daily-sets` row already exists for the date → no-op (`created: false`). This is what
  makes regeneration idempotent.
- If the pools are empty and nothing can be picked → no row created
  (`reason: 'no locations in pool'`).
- Otherwise it writes one `daily-sets` row: `{ date, rounds }`.

## Worked example

It's `2026-06-24`. Wikipedia's June 24 feed matched **Paris** (easy) and **Vienna**
(medium). `seededRng("2026-06-24")` shuffles the pools. Filling the ramp:

| Slot | Difficulty | `take` result |
|------|-----------|---------------|
| 1 | easy   | Paris — news-matched, unused (step 1) |
| 2 | easy   | first shuffled easy place that's unused & not Paris (step 3) |
| 3 | medium | Vienna — news-matched, unused (step 1) |
| 4 | hard   | first shuffled hard place, unused (step 3) |
| 5 | hard   | next shuffled hard place, unused (step 3) |

Paris and Vienna carry their event blurbs; the other three fall back to their own
`facts[]`. Re-running the generator for `2026-06-24` produces exactly this set again.

## Key files

- `src/lib/daily-generator.ts` — `selectRounds`, `getOrCreateDailySet`, `newsForDay`, pools.
- `src/lib/rng.ts` — `hashString`, `mulberry32`, `seededRng`, `shuffle`.
- `src/lib/scoring.ts` — the `Difficulty` type and multipliers.
