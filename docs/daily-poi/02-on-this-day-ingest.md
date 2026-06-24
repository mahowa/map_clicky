# 2. On This Day ingest & matching

[← Sourcing](01-sourcing.md) · [Wiki home](README.md) · Next: [Daily selection →](03-selection.md)

The library tells the game *what places exist*; the "On this day in history" feed tells it
*which of them are interesting today*. This enrichment is what makes a daily feel topical —
each chosen place can carry the historical event that surfaced it, revealed after the guess.

If this whole stage produces nothing (feed down, no matches), the daily still generates —
it just falls back to plain population-based selection. Under-matching is safe by design;
a *mis-placed* round is not, so matching is deliberately conservative.

## The source

The default (and only) source today is **Wikipedia's "On this day" feed** — free, no API
key (`src/lib/news/source.ts`):

```
https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/{MM}/{DD}
```

Events recur on a calendar day (MM-DD, UTC), not a full date — "on June 24" events show up
every June 24. `parseOnThisDay` maps the JSON into normalized `RawNewsEvent`s, each with:

- a stable **`sourceId`** for idempotency, e.g. `wp-onthisday:06-24:1789:<hash>`
- the event `text`, `year`, and a `link`
- **`places[]`** — the event's linked Wikipedia articles, each a title + optional `lat`/`lng`

The `NewsSource` interface (`src/lib/news/source.ts:27`) is the seam for adding other feeds
later without touching matching or selection. Everything below `fetchEvents` is pure (no
network, no clock) so it's unit-testable offline.

## Ingest

`ingestOnThisDay(dateStr)` (`src/lib/news/ingest.ts`) runs the pipeline for a UTC date:

1. Fetch + parse the feed for that day.
2. Load **all** locations into memory and build a match index (matching needs the full set).
3. For each event: skip if its `sourceId` already exists (idempotent), otherwise match it to
   location ids and **upsert a `news-items` row** carrying the event text, raw place
   candidates, and `matchedLocations`.

Matching happens **at ingest time**, so the daily generator only reads the
`matchedLocations` relationship — no per-request string scanning.

## Matching: events → location ids

`matchEventToLocationIds` (`src/lib/news/match-places.ts`) resolves each place candidate in
priority order. It's pure and deterministic (callers pass a location snapshot; ties break on
lowest id):

1. **Coordinate match** — if the candidate has lat/lng, the closest location within
   **25 km** (`COORD_MATCH_KM`) wins. This is the strongest signal.
2. **Exact normalized-name match** — `normalizeName` lowercases, strips diacritics, drops a
   leading article (the/le/la/el/los…) and any `(disambiguator)` suffix, and collapses
   punctuation. Then:
   - **Unique name** → match.
   - **Ambiguous name** (e.g. multiple "Springfield"s) → accept a candidate **only** if the
     event's text mentions a country that corroborates exactly one of them
     (`eventCountryIds`). Otherwise skip.
   - Names shorter than **4 chars** (`MIN_NAME_LEN`) are rejected as too ambiguous.

The result is a de-duplicated, id-sorted list stored on the news item.

> **Why so conservative?** A wrong match would place a round on the globe in the wrong spot —
> a real gameplay bug. A missed match just means the day leans on population selection. So
> the matcher prefers to skip rather than guess.

## Output

A `news-items` row (`src/collections/NewsItems.ts`) per event per calendar day, with:

- `calendarDay` (MM-DD, indexed) — how the daily generator finds today's events
- `matchedLocations` — the location ids this event resolved to
- `text` — the blurb, revealed post-guess as "On this day…"

The daily generator reads these via `newsForDay()` — see
[Daily selection](03-selection.md#news-input).

## Key files

- `src/lib/news/source.ts` — feed abstraction + Wikipedia source + parser.
- `src/lib/news/ingest.ts` — fetch → match → upsert into the inbox.
- `src/lib/news/match-places.ts` — coordinate/name matching, normalization, disambiguation.
- `src/collections/NewsItems.ts` — the inbox schema.
