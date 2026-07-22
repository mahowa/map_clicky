/**
 * Generates the site's static brand assets into public/ (issue #10):
 *   icon.svg (favicon source), favicon.png (48), apple-icon.png (180),
 *   og-image.png (1200x630 social card).
 *
 * Run with: pnpm exec tsx scripts/generate-assets.ts
 * Outputs are committed — re-run only when the branding changes.
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')

const NAVY = '#0f172a'
const SKY = '#38bdf8'
const EMERALD = '#34d399'

/** Globe-with-pin mark, drawn in a 100x100 viewBox. */
const mark = (x = 0, y = 0, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="50" cy="52" r="34" fill="none" stroke="${SKY}" stroke-width="6"/>
    <ellipse cx="50" cy="52" rx="15" ry="34" fill="none" stroke="${SKY}" stroke-width="4"/>
    <line x1="16" y1="52" x2="84" y2="52" stroke="${SKY}" stroke-width="4"/>
    <path d="M50 8 c-9 0 -16 7 -16 16 c0 12 16 26 16 26 s16 -14 16 -26 c0 -9 -7 -16 -16 -16 z"
      fill="${EMERALD}" stroke="${NAVY}" stroke-width="3"/>
    <circle cx="50" cy="23" r="6" fill="${NAVY}"/>
  </g>`

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${NAVY}"/>
  ${mark(0, 0, 1)}
</svg>`

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${NAVY}"/>
  <circle cx="1050" cy="580" r="420" fill="${SKY}" opacity="0.08"/>
  <circle cx="120" cy="60" r="260" fill="${EMERALD}" opacity="0.07"/>
  ${mark(120, 165, 3)}
  <text x="490" y="300" font-family="Helvetica, Arial, sans-serif" font-size="104" font-weight="800" fill="#f1f5f9">Terra Tap</text>
  <text x="493" y="368" font-family="Helvetica, Arial, sans-serif" font-size="38" fill="#94a3b8">Geography game on a 3D globe</text>
  <text x="493" y="428" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="${SKY}">Tap the globe. Closer means more points.</text>
</svg>`

async function run() {
  mkdirSync(pub, { recursive: true })
  writeFileSync(join(pub, 'icon.svg'), iconSvg)
  await sharp(Buffer.from(iconSvg)).resize(48, 48).png().toFile(join(pub, 'favicon.png'))
  await sharp(Buffer.from(iconSvg)).resize(180, 180).png().toFile(join(pub, 'apple-icon.png'))
  await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile(join(pub, 'icon-512.png'))
  await sharp(Buffer.from(iconSvg)).resize(192, 192).png().toFile(join(pub, 'icon-192.png'))
  await sharp(Buffer.from(ogSvg)).png().toFile(join(pub, 'og-image.png'))
  console.log('Assets written to public/')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
