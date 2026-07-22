import { describe, it, expect } from 'vitest'
import { buildSiteMetadata, SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '@/lib/seo'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import manifest from '@/app/manifest'

describe('buildSiteMetadata', () => {
  const md = buildSiteMetadata()

  it('sets a metadataBase so relative OG images resolve', () => {
    expect(String(md.metadataBase)).toBe(`${SITE_URL}/`)
  })

  it('brands title and description with the site name', () => {
    expect(JSON.stringify(md.title)).toContain(SITE_NAME)
    expect(md.description).toBe(SITE_DESCRIPTION)
  })

  it('declares an OpenGraph card with a 1200x630 image', () => {
    const images = md.openGraph?.images as Array<{ url: string; width: number; height: number }>
    expect(images[0]).toMatchObject({ url: '/og-image.png', width: 1200, height: 630 })
  })

  it('declares a large-image Twitter card', () => {
    expect(md.twitter).toMatchObject({ card: 'summary_large_image' })
  })

  it('allows indexing', () => {
    expect(md.robots).toMatchObject({ index: true, follow: true })
  })

  it('wires favicon + apple touch icons', () => {
    const icons = md.icons as { icon: Array<{ url: string }>; apple: Array<{ url: string }> }
    expect(icons.icon.map((i) => i.url)).toContain('/icon.svg')
    expect(icons.apple[0].url).toBe('/apple-icon.png')
  })
})

describe('robots.txt', () => {
  const r = robots()
  it('allows crawling the site but not admin or api', () => {
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules
    expect(rule).toMatchObject({ userAgent: '*', allow: '/' })
    expect(rule?.disallow).toEqual(expect.arrayContaining(['/admin', '/api']))
  })
  it('points at the sitemap', () => {
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`)
  })
})

describe('sitemap.xml', () => {
  const urls = sitemap().map((e) => e.url)
  it('lists the home and play pages', () => {
    expect(urls).toContain(SITE_URL)
    expect(urls).toContain(`${SITE_URL}/play`)
  })
})

describe('web manifest', () => {
  const m = manifest()
  it('is installable: name, start_url, display, and both icon sizes', () => {
    expect(m.name).toBe(SITE_NAME)
    expect(m.start_url).toBe('/')
    expect(m.display).toBe('standalone')
    expect(m.icons?.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  })
})
