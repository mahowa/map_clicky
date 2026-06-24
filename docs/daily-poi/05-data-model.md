# 5. Data model

[← Cron & runtime](04-cron-and-runtime.md) · [Wiki home](README.md) · Next: [Operations →](06-operations.md)

Three Payload collections drive the daily POI pipeline. All three are `read: () => true`
(public read) so the game can fetch them without auth.

## `locations` — the place library

`src/collections/Locations.ts`. Every guessable place. Editor-managed in the admin, filled
in bulk by the GeoNames importer.

| Field | Type | Notes |
|-------|------|-------|
| `name` | text (req) | Display name. `useAsTitle`. |
| `geonameId` | number, unique, indexed | Source id from GeoNames; enables idempotent re-import. Empty for hand-added rows. |
| `population` | number | Drives difficulty + selection weighting. |
| `country` | text (req) | Used in match disambiguation. |
| `lat` / `lng` | number (req) | −90..90 / −180..180. The answer coordinates + coord matching. |
| `difficulty` | select (req) | `easy` / `medium` / `hard`. Derived from population at import. |
| `tags` | select[] | capital, city, landmark, unesco, us-state, waterway, country. |
| `image` | upload | Optional, for picture-clue / flag modes. |
| `facts[]` | array of `{ text }` | "This day in history" blurbs; fallback post-guess fact. |

## `news-items` — the "On this day" inbox

`src/collections/NewsItems.ts`. One row per event per calendar day. Place matching runs at
ingest time and is stored here, so the daily generator just reads `matchedLocations`.

| Field | Type | Notes |
|-------|------|-------|
| `sourceId` | text, unique, indexed | Idempotency key, e.g. `wp-onthisday:06-24:1789:<hash>`. |
| `source` | text | Feed id, e.g. `wikipedia-onthisday`. |
| `calendarDay` | text, indexed | MM-DD (UTC). How the generator finds today's events. |
| `year` | number | Year the event occurred. |
| `text` | textarea (req) | The blurb, revealed post-guess as "On this day…". |
| `link` | text | Optional source link. |
| `rawPlaceCandidates[]` | array of `{ title, lat, lng }` | What we attempted to match. |
| `matchedLocations` | relationship → locations (hasMany) | Resolved at ingest time. |
| `fetchedAt` | date, readonly | When ingested. |

## `daily-sets` — the puzzle of the day

`src/collections/DailySets.ts`. One row per UTC day, holding the ordered five rounds.

| Field | Type | Notes |
|-------|------|-------|
| `date` | date, **unique** | The UTC day this set is active. One set per day. |
| `rounds[]` | array (1–5 rows) | Ordered rounds. |
| `rounds[].location` | relationship → locations (req) | The place to guess. |
| `rounds[].difficulty` | select (req) | easy (×1) / medium (×2) / hard (×3) — score multiplier. |
| `rounds[].event` | textarea | The "on this day" event that picked this place, if any. Revealed post-guess. |

## Relationships

```
news-items.matchedLocations ──┐
                              ├──▶ locations ◀── daily-sets.rounds[].location
       (ingest-time match)    ┘        ▲
                                       │ population → difficulty (geo.ts)
                              GeoNames import
```

## Key files

- `src/collections/Locations.ts`
- `src/collections/NewsItems.ts`
- `src/collections/DailySets.ts`
- `prisma/schema.prisma` — the underlying DB schema generated/used alongside Payload.
