import type { CollectionConfig } from 'payload'

/**
 * The 5-round daily puzzle. Each row is one calendar day (UTC) with an ordered
 * list of rounds, each pointing at a Location and carrying its difficulty.
 */
export const DailySets: CollectionConfig = {
  slug: 'daily-sets',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['date'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'date',
      type: 'date',
      required: true,
      unique: true,
      admin: {
        description: 'The UTC date this set is active. One set per day.',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' },
      },
    },
    {
      name: 'rounds',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 5,
      admin: { description: 'Ordered rounds. Difficulty drives the score multiplier.' },
      fields: [
        {
          name: 'location',
          type: 'relationship',
          relationTo: 'locations',
          required: true,
        },
        {
          name: 'difficulty',
          type: 'select',
          required: true,
          defaultValue: 'easy',
          options: [
            { label: 'Easy (x1)', value: 'easy' },
            { label: 'Medium (x2)', value: 'medium' },
            { label: 'Hard (x3)', value: 'hard' },
          ],
        },
        {
          name: 'event',
          type: 'textarea',
          admin: {
            description:
              'The "on this day" event that picked this place, if any. Revealed post-guess.',
          },
        },
      ],
    },
  ],
}
