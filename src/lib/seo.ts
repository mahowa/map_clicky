import type { Metadata } from 'next'

/**
 * Site-wide SEO constants and metadata builder (issue #10). Kept as pure
 * values/functions so robots/sitemap/manifest and the layout all agree and
 * the whole surface is unit-testable.
 */

export const SITE_NAME = 'Terra Tap'
export const SITE_URL = 'https://map-clicky.vercel.app'
export const SITE_DESCRIPTION =
  'A free geography game on a 3D globe. Tap where you think each place is — ' +
  'closer means more points. New daily challenge every day.'

/** Root metadata for the frontend layout (OpenGraph + Twitter + robots). */
export function buildSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} — Geography Game on a 3D Globe`,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [
      'geography game',
      'globe game',
      'map quiz',
      'daily geography challenge',
      'guess the place',
      'geoguessr alternative',
    ],
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Geography Game on a 3D Globe`,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${SITE_NAME} — tap the globe` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${SITE_NAME} — Geography Game on a 3D Globe`,
      description: SITE_DESCRIPTION,
      images: ['/og-image.png'],
    },
    robots: { index: true, follow: true },
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon.png', sizes: '48x48' }],
      apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
    },
  }
}
