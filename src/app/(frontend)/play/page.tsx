import { getDailyRun } from '@/lib/rounds'
import GlobeGame from '@/components/GlobeGame'
import '../styles.css'
import './play.css'

export const dynamic = 'force-dynamic'

export default async function PlayPage() {
  const run = await getDailyRun()

  if (!run.rounds.length) {
    return (
      <div className="gg-empty">
        <h1>No locations yet</h1>
        <p>
          Add some in the <a href="/admin">admin panel</a> or run <code>pnpm exec tsx scripts/seed.ts</code>.
        </p>
      </div>
    )
  }

  return <GlobeGame run={run} />
}
