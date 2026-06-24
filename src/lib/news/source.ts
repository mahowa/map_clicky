/**
 * News source abstraction for the "on this day in history" inbox.
 *
 * The default source is Wikipedia's "On this day" feed (JSON, free, no key).
 * Everything below the `parseOnThisDay` mapper is pure so it can be tested
 * offline; only `fetchEvents` touches the network. A literal XML/RSS source can
 * be added later by implementing `NewsSource` without changing matching or
 * selection.
 */

/** A place referenced by an event (a linked article, with coords when known). */
export type RawPlaceCandidate = { title: string; lat?: number; lng?: number }

/** One normalized history event, source-agnostic. */
export type RawNewsEvent = {
  /** Stable idempotency key for the inbox row. */
  sourceId: string
  source: string
  /** MM-DD (UTC) this event recurs on. */
  calendarDay: string
  year?: number
  text: string
  link?: string
  places: RawPlaceCandidate[]
}

export interface NewsSource {
  readonly id: string
  /** Fetch + parse events for a UTC date (YYYY-MM-DD). */
  fetchEvents(dateStr: string): Promise<RawNewsEvent[]>
}

/** MM-DD (UTC) for a YYYY-MM-DD date string. */
export function calendarDayOf(dateStr: string): string {
  return dateStr.slice(5, 10)
}

/** Small, stable 32-bit hash → hex, for deduping events by text. */
function hashHex(str: string): string {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Shape of the Wikipedia "On this day" events payload (defensive subset). */
type WikiOnThisDayJson = {
  events?: Array<{
    text?: string
    year?: number
    pages?: Array<{
      normalizedtitle?: string
      title?: string
      content_urls?: { desktop?: { page?: string } }
      coordinates?: { lat?: number; lon?: number }
    }>
  }>
}

const WIKI_SOURCE_ID = 'wikipedia-onthisday'

/**
 * Pure mapper: Wikipedia JSON → normalized events. No network, no Date.
 * `calendarDay` is MM-DD (used for the inbox row + idempotency key).
 */
export function parseOnThisDay(json: unknown, calendarDay: string): RawNewsEvent[] {
  const data = (json ?? {}) as WikiOnThisDayJson
  const events = Array.isArray(data.events) ? data.events : []
  const out: RawNewsEvent[] = []

  for (const ev of events) {
    const text = typeof ev?.text === 'string' ? ev.text.trim() : ''
    if (!text) continue
    const year = typeof ev?.year === 'number' ? ev.year : undefined

    const places: RawPlaceCandidate[] = []
    let link: string | undefined
    for (const page of Array.isArray(ev?.pages) ? ev.pages : []) {
      const title = (page?.normalizedtitle ?? page?.title ?? '').trim()
      if (!link) link = page?.content_urls?.desktop?.page
      if (!title) continue
      const lat = page?.coordinates?.lat
      const lon = page?.coordinates?.lon
      places.push({
        title,
        ...(typeof lat === 'number' ? { lat } : {}),
        ...(typeof lon === 'number' ? { lng: lon } : {}),
      })
    }

    out.push({
      sourceId: `wp-onthisday:${calendarDay}:${year ?? 'na'}:${hashHex(text)}`,
      source: WIKI_SOURCE_ID,
      calendarDay,
      year,
      text,
      link,
      places,
    })
  }

  return out
}

/** The default Wikipedia "On this day" source. */
export const wikipediaOnThisDay: NewsSource = {
  id: WIKI_SOURCE_ID,
  async fetchEvents(dateStr: string): Promise<RawNewsEvent[]> {
    const mm = dateStr.slice(5, 7)
    const dd = dateStr.slice(8, 10)
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${mm}/${dd}`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
    return parseOnThisDay(await res.json(), calendarDayOf(dateStr))
  },
}
