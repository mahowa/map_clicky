import type { CollectionConfig } from 'payload'

/**
 * The "RSS" inbox: ingested "on this day in history" events. One row per event
 * per calendar day. Place matching runs at ingest time so the daily generator
 * only has to read the `matchedLocations` relationship — no per-request string
 * scanning. Idempotent on `sourceId` (re-ingesting a day is a no-op).
 */
export const NewsItems: CollectionConfig = {
  slug: 'news-items',
  admin: {
    useAsTitle: 'text',
    defaultColumns: ['calendarDay', 'year', 'text', 'source'],
    group: 'Content',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'sourceId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Stable idempotency key, e.g. wp-onthisday:06-24:1789:<hash>.',
        readOnly: true,
      },
    },
    {
      name: 'source',
      type: 'text',
      required: true,
      admin: { position: 'sidebar', description: 'Feed identifier, e.g. wikipedia-onthisday.' },
    },
    {
      name: 'calendarDay',
      type: 'text',
      required: true,
      index: true,
      admin: { position: 'sidebar', description: 'MM-DD this event recurs on (UTC).' },
    },
    {
      name: 'year',
      type: 'number',
      admin: { position: 'sidebar', description: 'Year the event occurred.' },
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
      admin: { description: 'The event blurb, revealed post-guess as "On this day…".' },
    },
    {
      name: 'link',
      type: 'text',
      admin: { description: 'Optional source link.' },
    },
    {
      name: 'rawPlaceCandidates',
      type: 'array',
      admin: { description: 'Place names/coords we attempted to match against locations.' },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          type: 'row',
          fields: [
            { name: 'lat', type: 'number', admin: { width: '50%' } },
            { name: 'lng', type: 'number', admin: { width: '50%' } },
          ],
        },
      ],
    },
    {
      name: 'matchedLocations',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: true,
      admin: { description: 'Locations resolved from this event at ingest time.' },
    },
    {
      name: 'fetchedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
