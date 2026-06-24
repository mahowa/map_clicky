import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getOrCreateDailySet } from '@/lib/daily-generator'
import { ingestOnThisDay } from '@/lib/news/ingest'

/**
 * Ingests today's "on this day" history feed into the news inbox, then generates
 * today's daily set (news-first selection, population fallback). Triggered by
 * Vercel Cron (see vercel.json). Protected by CRON_SECRET: Vercel sends it as
 * `Authorization: Bearer <secret>`.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const date = new Date().toISOString().slice(0, 10)
  try {
    const payload = await getPayload({ config: await config })

    // Ingest first so the generator can use today's events. A feed failure must
    // not block the daily — it just falls back to population-based selection.
    let news: unknown = null
    try {
      news = await ingestOnThisDay(date, payload)
    } catch (err) {
      news = { error: 'ingest failed', detail: String(err) }
    }

    const result = await getOrCreateDailySet(date, payload)
    return NextResponse.json({ ...result, news })
  } catch (err) {
    return NextResponse.json(
      { error: 'generation failed', detail: String(err), date },
      { status: 500 },
    )
  }
}
