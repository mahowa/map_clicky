import GlobeGame from '@/components/GlobeGame'
import { buildHistoryRun } from '@/lib/history'
import '../styles.css'
import '../play/play.css'

// Each visit deals a fresh random hand from the history pool.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Geography History',
  description:
    'Read a moment from history and tap the globe where it happened. The map is labeled — the puzzle is knowing your history.',
}

export default async function HistoryPage() {
  const run = buildHistoryRun(Math.random)
  return <GlobeGame run={run} />
}
