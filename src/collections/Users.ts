import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'displayName',
  },
  auth: true,
  fields: [
    // Email + auth fields added by default
    {
      name: 'displayName',
      type: 'text',
    },
    {
      name: 'countryFlag',
      type: 'text',
      admin: { description: 'ISO country code / emoji flag shown on the profile.' },
    },
    {
      name: 'prefs',
      type: 'group',
      label: 'Gameplay preferences',
      fields: [
        { name: 'tapAssist', type: 'checkbox', defaultValue: false },
        { name: 'confirmTap', type: 'checkbox', defaultValue: false },
        { name: 'showPreviousGuess', type: 'checkbox', defaultValue: true },
        {
          name: 'scrollSensitivity',
          type: 'number',
          defaultValue: 1,
          min: 0.25,
          max: 4,
        },
        { name: 'useUtc', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
  versions: false,
}
