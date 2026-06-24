/**
 * Ingest the "on this day in history" feed into the news-items inbox. Defaults
 * to today (UTC). Use --date to target a day, or --days N to ingest N days from
 * --date/today. Matching to locations runs at ingest.
 *
 *   pnpm exec tsx scripts/ingest-news.ts
 *   pnpm exec tsx scripts/ingest-news.ts --date 2026-06-24
 *   pnpm exec tsx scripts/ingest-news.ts --days 7
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { ingestOnThisDay } from '../src/lib/news/ingest'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function addDays(dateStr: string, n: number): string {
  return new Date(Date.parse(`${dateStr}T00:00:00.000Z`) + n * 86400000).toISOString().slice(0, 10)
}

async function run() {
  const payload = await getPayload({ config: await config })
  const startDate = arg('--date') ?? new Date().toISOString().slice(0, 10)
  const days = Number(arg('--days') ?? 1)

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i)
    const res = await ingestOnThisDay(date, payload)
    payload.logger.info(
      `Ingested ${date}: ${res.created} new (${res.skipped} existing) of ${res.fetched} events, ${res.matched} with matched places`,
    )
  }
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
