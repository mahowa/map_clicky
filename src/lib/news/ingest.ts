import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { wikipediaOnThisDay, type NewsSource } from './source'
import {
  buildLocationIndex,
  matchEventToLocationIds,
  type MatchableLocation,
} from './match-places'

export type IngestResult = {
  date: string
  fetched: number
  created: number
  skipped: number
  matched: number
}

/** Page through every location once; matching needs the full set in memory. */
async function loadLocations(payload: Payload): Promise<MatchableLocation[]> {
  const out: MatchableLocation[] = []
  let page = 1
  for (;;) {
    const res = await payload.find({ collection: 'locations', limit: 500, page, depth: 0 })
    for (const d of res.docs) {
      out.push({
        id: d.id as number,
        name: d.name,
        country: d.country,
        lat: d.lat,
        lng: d.lng,
      })
    }
    if (!res.hasNextPage) break
    page += 1
  }
  return out
}

/**
 * Fetch the "on this day" feed for `dateStr` (YYYY-MM-DD, UTC), match each event
 * to locations, and upsert into the `news-items` inbox. Idempotent on
 * `sourceId`: re-ingesting a day only adds events not already stored.
 */
export async function ingestOnThisDay(
  dateStr: string,
  payloadArg?: Payload,
  source: NewsSource = wikipediaOnThisDay,
): Promise<IngestResult> {
  const payload = payloadArg ?? (await getPayload({ config: await config }))

  const events = await source.fetchEvents(dateStr)
  const index = buildLocationIndex(await loadLocations(payload))
  const fetchedAt = new Date().toISOString()

  let created = 0
  let skipped = 0
  let matched = 0

  for (const ev of events) {
    const existing = await payload.find({
      collection: 'news-items',
      where: { sourceId: { equals: ev.sourceId } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }

    const matchedLocations = matchEventToLocationIds(ev, index)
    if (matchedLocations.length > 0) matched += 1

    await payload.create({
      collection: 'news-items',
      data: {
        sourceId: ev.sourceId,
        source: ev.source,
        calendarDay: ev.calendarDay,
        year: ev.year,
        text: ev.text,
        link: ev.link,
        rawPlaceCandidates: ev.places.map((p) => ({ title: p.title, lat: p.lat, lng: p.lng })),
        matchedLocations,
        fetchedAt,
      },
    })
    created += 1
  }

  return { date: dateStr, fetched: events.length, created, skipped, matched }
}
