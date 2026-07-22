import { notFound } from 'next/navigation'
import GlobeGame from '@/components/GlobeGame'
import { buildPracticeSpeedRun, SPEED_ROUND_SECONDS } from '@/lib/speed'
import '../../styles.css'
import '../../play/play.css'

// Fresh random hand every visit — this is the unranked trainer (#33).
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Speed Run Practice',
  description: `Unranked speed practice — five random places, ${SPEED_ROUND_SECONDS} seconds each, replay as much as you like. Optionally drill a single quiz pool with ?quiz=<slug>.`,
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function SpeedPracticePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const quizSlug = typeof sp.quiz === 'string' ? sp.quiz : null
  const run = buildPracticeSpeedRun(Math.random, quizSlug)
  if (!run) notFound()
  return <GlobeGame run={run} />
}
