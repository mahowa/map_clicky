# 1. Sourcing the location library

[← Wiki home](README.md) · Next: [On This Day ingest →](02-on-this-day-ingest.md)

Every place the game can ask you to guess lives in the **`locations`** collection
(`src/collections/Locations.ts`). This is the raw material the daily picker draws from —
nothing can be selected for a daily that isn't in this library first.

## Where the data comes from

Locations are imported from **[GeoNames](https://www.geonames.org/)** (public domain /
CC-BY) by `scripts/import-geonames.ts`. Two files are used:

| File | Purpose |
|------|---------|
| `cities15000.zip` | All cities with population > 15,000 (id, name, lat/lng, feature code, country code, population) |
| `countryInfo.txt`  | ISO 2-letter country code → country name |

The importer downloads + unzips the cities file (or reads a local `--file`), parses the
tab-separated columns (`scripts/import-geonames.ts:79`), sorts by population descending,
and keeps the top `--limit` (default 1000) above `--min-pop` (default 100,000).

Each row is keyed by **`geonameId`** (`unique`, indexed). Re-running the importer only adds
new cities — it's idempotent (`scripts/import-geonames.ts:127`).

> Editors can also add locations by hand in the Payload admin. Hand-added rows simply have
> no `geonameId`.

## Difficulty tiers

Difficulty is **derived from population** (and capital status) by
`difficultyFromPopulation` in `src/lib/geo.ts`:

```ts
export function difficultyFromPopulation(population: number, isCapital = false): Difficulty {
  if (isCapital) return 'easy'
  if (population >= 2_000_000) return 'easy'
  if (population >= 500_000) return 'medium'
  return 'hard'
}
```

| Tier   | Rule |
|--------|------|
| `easy`   | A capital city, **or** population ≥ 2,000,000 |
| `medium` | population ≥ 500,000 |
| `hard`   | everything else (down to the 15k floor in the source file) |

Capitals are detected via the GeoNames feature code `PPLC`
(`scripts/import-geonames.ts:94`) and tagged `capital`; everything else is tagged `city`.

This tiering is the only thing the selector needs from a location to slot it into the
day's difficulty ramp — see [Daily selection](03-selection.md).

## What a location carries

Beyond name / country / lat / lng / difficulty (see [Data model](05-data-model.md)), two
fields matter for the daily:

- **`population`** — feeds the difficulty derivation above.
- **`facts[]`** — "this day in history"-style blurbs. If a round wasn't selected by a
  Wikipedia event, the first fact is shown post-guess as a fallback
  (`src/lib/rounds.ts:24`).

## Key files

- `src/collections/Locations.ts` — the collection schema.
- `scripts/import-geonames.ts` — the GeoNames importer.
- `src/lib/geo.ts` — population → difficulty.
- `scripts/seed.ts` — a tiny hand-written dev seed (5 capitals) for local work.
