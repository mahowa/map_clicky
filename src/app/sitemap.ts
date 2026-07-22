import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { QUIZZES } from '@/lib/quizzes'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/play`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/quizzes`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/speed`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/history`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/versus`, changeFrequency: 'monthly', priority: 0.8 },
    ...QUIZZES.map((q) => ({
      url: `${SITE_URL}/quiz/${q.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
