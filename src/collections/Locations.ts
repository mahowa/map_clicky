import type { CollectionConfig } from 'payload'

/**
 * The core content library: every guessable place on the globe.
 * Editor-managed in the Payload admin. Read-public so the game can fetch them.
 */
export const Locations: CollectionConfig = {
  slug: 'locations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'difficulty', 'population', 'lat', 'lng'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'geonameId',
      type: 'number',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Source id from GeoNames (set by the importer; enables idempotent re-import).',
        readOnly: true,
      },
    },
    {
      name: 'population',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Population, used to derive difficulty and weight selection.',
      },
    },
    {
      name: 'country',
      type: 'text',
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lat',
          type: 'number',
          required: true,
          min: -90,
          max: 90,
          admin: { width: '50%', description: 'Latitude (-90 to 90)' },
        },
        {
          name: 'lng',
          type: 'number',
          required: true,
          min: -180,
          max: 180,
          admin: { width: '50%', description: 'Longitude (-180 to 180)' },
        },
      ],
    },
    {
      name: 'difficulty',
      type: 'select',
      required: true,
      defaultValue: 'easy',
      options: [
        { label: 'Easy', value: 'easy' },
        { label: 'Medium', value: 'medium' },
        { label: 'Hard', value: 'hard' },
      ],
    },
    {
      name: 'tags',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Capital', value: 'capital' },
        { label: 'City', value: 'city' },
        { label: 'Landmark', value: 'landmark' },
        { label: 'UNESCO Site', value: 'unesco' },
        { label: 'US State', value: 'us-state' },
        { label: 'Waterway', value: 'waterway' },
        { label: 'Country', value: 'country' },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional image for picture-clue / flag modes.' },
    },
    {
      name: 'facts',
      type: 'array',
      labels: { singular: 'Fact', plural: 'Facts' },
      admin: { description: '"This day in history" style blurbs revealed after a guess.' },
      fields: [
        {
          name: 'text',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
}
