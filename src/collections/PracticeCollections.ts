import type { CollectionConfig } from 'payload'

/**
 * Themed practice bundles (World Capitals, US States, Landmarks, ...).
 * Players pick a collection and play seeded rounds from its locations.
 */
export const PracticeCollections: CollectionConfig = {
  slug: 'practice-collections',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'theme'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'theme',
      type: 'text',
      admin: { description: 'Short label, e.g. "Capitals", "Landmarks".' },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'locations',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: true,
      required: true,
    },
  ],
}
