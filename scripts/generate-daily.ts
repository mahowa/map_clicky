/**
 * Generate daily set(s). Defaults to today (UTC). Use --date to target a day,
 * or --days N to backfill the next N days starting from --date/today.
 *
 *   pnpm exec tsx scripts/generate-daily.ts
 *   pnpm exec tsx scripts/generate-daily.ts --date 2026-06-23
 *   pnpm exec tsx scripts/generate-daily.ts --days 7
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { getOrCreateDailySet } from '../src/lib/daily-generator'

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

  const force = process.argv.includes('--force')

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i)
    if (force) {
      const start = `${date}T00:00:00.000Z`
      const next = new Date(Date.parse(start) + 86400000).toISOString()
      await payload.delete({
        collection: 'daily-sets',
        where: { date: { greater_than_equal: start, less_than: next } },
      })
    }
    const res = await getOrCreateDailySet(date, payload)
    payload.logger.info(
      res.created
        ? `Created daily ${date}: locations [${res.locationIds.join(', ')}]`
        : `Skipped ${date}: ${res.reason}`,
    )
  }
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
