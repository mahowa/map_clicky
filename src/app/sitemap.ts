import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/play`, changeFrequency: 'daily', priority: 0.9 },
  ]
}
