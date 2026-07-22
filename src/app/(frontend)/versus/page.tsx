import GlobeGame from '@/components/GlobeGame'
import { buildVersusRun, decodeChallenge, newVersusSeed } from '@/lib/versus'
import '../styles.css'
import '../play/play.css'

// Seed comes from the challenge URL (or is freshly rolled for a new battle).
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Versus',
  description:
    'Battle a friend head-to-head: play five places, send the challenge link, and they play the exact same rounds. Highest total wins.',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function VersusPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const rawSeed = typeof sp.seed === 'string' ? sp.seed : ''
  const seed = /^[a-z0-9-]{1,32}$/.test(rawSeed) ? rawSeed : newVersusSeed(Math.random)
  const run = buildVersusRun(seed)
  // Checksum-bound token (#28): an edited or foreign payload decodes to null,
  // and the run gracefully plays as a plain (unchallenged) versus round.
  const opponentBases = decodeChallenge(
    typeof sp.s === 'string' ? sp.s : null,
    seed,
    run.rounds.length,
  )
  return <GlobeGame run={run} opponentBases={opponentBases} />
}
