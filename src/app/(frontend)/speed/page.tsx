import GlobeGame from '@/components/GlobeGame'
import { buildSpeedRun, SPEED_ROUND_SECONDS } from '@/lib/speed'
import '../styles.css'
import '../play/play.css'

// Each visit deals a fresh random hand from the speed pool.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Speed Run',
  description: `The classic game against the clock — ${SPEED_ROUND_SECONDS} seconds per round. No guess when time runs out means zero points.`,
}

export default async function SpeedPage() {
  const run = buildSpeedRun(Math.random)
  return <GlobeGame run={run} />
}
