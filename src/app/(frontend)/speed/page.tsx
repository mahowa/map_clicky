import GlobeGame from '@/components/GlobeGame'
import { buildSpeedRun, SPEED_ROUND_SECONDS } from '@/lib/speed'
import '../styles.css'
import '../play/play.css'

// The hand is dealt from the current UTC day — same for everyone (#21).
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Speed Run',
  description: `Today's five places against the clock — ${SPEED_ROUND_SECONDS} seconds per round, same hand for everyone, one attempt per day.`,
}

export default async function SpeedPage() {
  const day = new Date().toISOString().slice(0, 10)
  const run = buildSpeedRun(day)
  return <GlobeGame run={run} />
}
