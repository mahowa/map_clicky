/**
 * Import real cities from GeoNames into the `locations` collection.
 *
 * Sources (public domain, CC-BY):
 *   - https://download.geonames.org/export/dump/cities15000.zip  (cities > 15k pop)
 *   - https://download.geonames.org/export/dump/countryInfo.txt  (ISO code -> name)
 *
 * Difficulty is derived from population via src/lib/geo.ts. Idempotent: rows are
 * keyed by geonameId, so re-running only adds new cities.
 *
 * Usage:
 *   pnpm exec tsx scripts/import-geonames.ts [--limit 1000] [--min-pop 100000]
 *                                            [--file path/to/cities.txt]
 *
 * If --file is omitted the script downloads + unzips cities15000 (needs `unzip`
 * on PATH; macOS/Linux have it). Pass --file to use a pre-downloaded TSV.
 */
import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { difficultyFromPopulation } from '../src/lib/geo'

const CITIES_ZIP_URL = 'https://download.geonames.org/export/dump/cities15000.zip'
const COUNTRY_INFO_URL = 'https://download.geonames.org/export/dump/countryInfo.txt'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const LIMIT = Number(arg('--limit') ?? 1000)
const MIN_POP = Number(arg('--min-pop') ?? 100_000)
const FILE = arg('--file')

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  return res.text()
}

/** ISO 2-letter code -> country name, from countryInfo.txt. */
async function loadCountryMap(): Promise<Map<string, string>> {
  const txt = await fetchText(COUNTRY_INFO_URL)
  const map = new Map<string, string>()
  for (const line of txt.split('\n')) {
    if (!line || line.startsWith('#')) continue
    const cols = line.split('\t')
    if (cols.length > 4 && cols[0]) map.set(cols[0], cols[4])
  }
  return map
}

/** Download cities15000.zip and return the extracted .txt contents. */
async function loadCitiesFile(): Promise<string> {
  if (FILE) return readFileSync(FILE, 'utf8')
  const dir = mkdtempSync(path.join(tmpdir(), 'geonames-'))
  const zipPath = path.join(dir, 'cities15000.zip')
  console.log('Downloading', CITIES_ZIP_URL)
  const buf = Buffer.from(await (await fetch(CITIES_ZIP_URL)).arrayBuffer())
  writeFileSync(zipPath, buf)
  execFileSync('unzip', ['-o', zipPath, '-d', dir], { stdio: 'ignore' })
  return readFileSync(path.join(dir, 'cities15000.txt'), 'utf8')
}

type Candidate = {
  geonameId: number
  name: string
  lat: number
  lng: number
  countryCode: string
  population: number
  isCapital: boolean
}

function parseCities(txt: string): Candidate[] {
  const out: Candidate[] = []
  for (const line of txt.split('\n')) {
    if (!line) continue
    const c = line.split('\t')
    // GeoNames columns: 0 id, 1 name, 4 lat, 5 lng, 7 feature code, 8 country, 14 population
    const population = Number(c[14] || 0)
    if (population < MIN_POP) continue
    out.push({
      geonameId: Number(c[0]),
      name: c[1],
      lat: Number(c[4]),
      lng: Number(c[5]),
      countryCode: c[8],
      population,
      isCapital: c[7] === 'PPLC',
    })
  }
  return out
}

async function run() {
  const payload = await getPayload({ config: await config })

  const [countryMap, citiesTxt] = await Promise.all([loadCountryMap(), loadCitiesFile()])
  const candidates = parseCities(citiesTxt)
    .sort((a, b) => b.population - a.population)
    .slice(0, LIMIT)
  payload.logger.info(`Parsed ${candidates.length} candidate cities (min pop ${MIN_POP}, limit ${LIMIT})`)

  // Existing geonameIds, to stay idempotent.
  const existing = new Set<number>()
  let page = 1
  for (;;) {
    const res = await payload.find({
      collection: 'locations',
      where: { geonameId: { exists: true } },
      limit: 500,
      page,
      depth: 0,
    })
    for (const d of res.docs) if (typeof d.geonameId === 'number') existing.add(d.geonameId)
    if (!res.hasNextPage) break
    page += 1
  }

  let created = 0
  let skipped = 0
  for (const c of candidates) {
    if (existing.has(c.geonameId)) {
      skipped += 1
      continue
    }
    const country = countryMap.get(c.countryCode)
    if (!country) {
      skipped += 1
      continue
    }
    await payload.create({
      collection: 'locations',
      data: {
        name: c.name,
        country,
        lat: c.lat,
        lng: c.lng,
        geonameId: c.geonameId,
        population: c.population,
        difficulty: difficultyFromPopulation(c.population, c.isCapital),
        tags: c.isCapital ? ['capital'] : ['city'],
      },
    })
    created += 1
    if (created % 100 === 0) payload.logger.info(`...created ${created}`)
  }

  payload.logger.info(`Import complete: created ${created}, skipped ${skipped}`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
