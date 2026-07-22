# Daily POI Wiki

How Terra Tap chooses and sources the five "points of interest" (POIs) that make up
each day's puzzle.

This wiki documents the full pipeline, from the raw geographic data that fills the
location library, through the daily "on this day in history" enrichment, to the
deterministic algorithm that picks today's five rounds.

## TL;DR

- **Library** — every guessable place lives in the `locations` collection, seeded from
  **GeoNames** (`cities15000`). Population determines a difficulty tier (easy / medium /
  hard).
- **Enrichment** — a daily cron fetches Wikipedia's **"On this day"** feed, matches the
  events to library locations, and stores them in the `news-items` inbox.
- **Selection** — for each UTC date, a seeded RNG shuffles the difficulty pools and fills
  a fixed `easy, easy, medium, hard, hard` ramp, **preferring** news-matched and
  not-recently-used places. Same date ⇒ same puzzle, every time.
- **Runtime** — the game loads today's `daily-sets` row; if it's missing it falls back to
  the most recent set, then to a random practice run.

> ⚠️ **Keep this wiki current.** This documentation is only useful while it matches the
> code. When you change the daily-POI pipeline — the sourcing, ingest/matching, selection
> algorithm, cron schedule, collection schemas, or the scripts — **update the affected
> page(s) in the same change**, including any `file:line` references, constants (e.g.
> `AVOID_RECENT_DAYS`, difficulty thresholds, cron time), and the diagram below. Treat the
> docs as part of the change, not a follow-up.

## Pages

1. [Sourcing the location library](01-sourcing.md) — GeoNames import, difficulty tiers.
2. [On This Day ingest & matching](02-on-this-day-ingest.md) — Wikipedia feed, place
   matching.
3. [Daily selection algorithm](03-selection.md) — the seeded, deterministic picker.
4. [Cron & runtime retrieval](04-cron-and-runtime.md) — how a day is generated and served.
5. [Data model](05-data-model.md) — the Payload collections involved.
6. [Operations & scripts](06-operations.md) — seeding, importing, backfilling, testing.

## Pipeline at a glance

```
GeoNames cities15000  ──import──▶  locations collection  (difficulty by population)
                                          │
Wikipedia "On this day"  ──ingest──▶  news-items inbox  (matched → location ids)
                                          │
                                          ▼
            getOrCreateDailySet(date)  ──seeded select──▶  daily-sets row (5 rounds)
                                          │
                                          ▼
                     getDailyRun()  ──serves──▶  today's game (or fallback)
```
