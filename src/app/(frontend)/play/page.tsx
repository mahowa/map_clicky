import { getDailyRun } from '@/lib/rounds'
import GlobeGame from '@/components/GlobeGame'
import '../styles.css'
import './play.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Play the Daily',
  description:
    "Today's five places, one guess each. Tap the globe where you think each one is — closer means more points.",
}

export default async function PlayPage() {
  const run = await getDailyRun()

  if (!run.rounds.length) {
    return (
      <div className="gg-empty">
        <h1>No locations yet</h1>
        <p>Today&apos;s puzzle isn&apos;t ready yet — check back soon.</p>
      </div>
    )
  }

  return <GlobeGame run={run} />
}
