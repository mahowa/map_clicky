'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { scoreRound, type LatLng, DIFFICULTY_MULTIPLIER } from '@/lib/scoring'
import type { GameRun, Round } from '@/lib/game-types'
import { formatDailyShare } from '@/lib/share'

// react-globe.gl touches window/WebGL — import it manually on the client only,
// after mount, so it never executes during SSR.
type GlobeProps = Record<string, unknown>

function useGlobeComponent(): ComponentType<GlobeProps> | null {
  const [Comp, setComp] = useState<ComponentType<GlobeProps> | null>(null)
  useEffect(() => {
    let active = true
    import('react-globe.gl').then((m) => {
      if (active) setComp(() => m.default as unknown as ComponentType<GlobeProps>)
    })
    return () => {
      active = false
    }
  }, [])
  return Comp
}

// Locally-hosted high-res Blue Marble (5400×2700, public-domain NASA) for sharper
// zoom than three-globe's stock 2K example texture. Served from /public.
const EARTH_TEXTURE = '/earth-blue-marble.jpg'
const GUESS_COLOR = '#38bdf8' // sky-400
const ANSWER_COLOR = '#34d399' // emerald-400

type Phase = 'guessing' | 'revealed' | 'done'

type RoundResult = {
  round: Round
  guess: LatLng
  distanceKm: number
  points: number
  base: number
  multiplier: number
}

type PointDatum = LatLng & { color: string; label: string; size: number }

/** Serializable per-round result persisted to the browser for the daily lock. */
type SavedRound = {
  name: string
  base: number
  multiplier: number
  points: number
  distanceKm: number
}
type SavedDaily = { dateKey: string; total: number; rounds: SavedRound[] }

const storageKey = (dateKey: string) => `mapclippy:daily:${dateKey}`

function loadSavedDaily(dateKey: string): SavedDaily | null {
  if (typeof window === 'undefined' || !dateKey) return null
  try {
    const raw = window.localStorage.getItem(storageKey(dateKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedDaily
    return Array.isArray(parsed.rounds) ? parsed : null
  } catch {
    return null
  }
}

function saveDaily(data: SavedDaily): void {
  if (typeof window === 'undefined' || !data.dateKey) return
  try {
    window.localStorage.setItem(storageKey(data.dateKey), JSON.stringify(data))
  } catch {
    /* ignore quota / private-mode errors */
  }
}

const toSavedRound = (r: RoundResult): SavedRound => ({
  name: r.round.name,
  base: r.base,
  multiplier: r.multiplier,
  points: r.points,
  distanceKm: r.distanceKm,
})

export default function GlobeGame({ run }: { run: GameRun }) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('guessing')
  const [guess, setGuess] = useState<LatLng | null>(null)
  const [results, setResults] = useState<RoundResult[]>([])
  const [size, setSize] = useState({ w: 800, h: 600 })
  // Daily lock: result loaded from / saved to the browser, and whether it was a prior day's play.
  const [saved, setSaved] = useState<SavedDaily | null>(null)
  const [playedEarlier, setPlayedEarlier] = useState(false)
  const [copied, setCopied] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<unknown>(null)
  const Globe = useGlobeComponent()

  // On mount, if today's daily was already played in this browser, jump to results.
  useEffect(() => {
    if (run.mode !== 'daily') return
    const prior = loadSavedDaily(run.dateKey)
    if (prior) {
      setSaved(prior)
      setPlayedEarlier(true)
      setPhase('done')
    }
  }, [run.mode, run.dateKey])

  const round = run.rounds[index]
  const answer: LatLng | null = round ? { lat: round.lat, lng: round.lng } : null

  // Expose the globe instance for e2e/testing (harmless dev affordance).
  useEffect(() => {
    if (typeof window !== 'undefined' && globeRef.current) {
      ;(window as unknown as Record<string, unknown>).__mc_globe = globeRef.current
    }
  }, [Globe])

  // Maximize Earth-texture sharpness at grazing/zoomed angles via anisotropic
  // filtering. The texture loads async, so poll briefly until it's available.
  useEffect(() => {
    const g = globeRef.current as {
      globeMaterial?: () => { map?: { anisotropy: number; needsUpdate: boolean } | null } | null
      renderer?: () => { capabilities?: { getMaxAnisotropy?: () => number } } | null
    } | null
    if (!g?.globeMaterial || !g.renderer) return
    let tries = 0
    const id = setInterval(() => {
      tries += 1
      const map = g.globeMaterial?.()?.map
      if (map) {
        map.anisotropy = g.renderer?.()?.capabilities?.getMaxAnisotropy?.() ?? 8
        map.needsUpdate = true
        clearInterval(id)
      } else if (tries > 50) {
        clearInterval(id)
      }
    }, 100)
    return () => clearInterval(id)
  }, [Globe])

  // Responsive sizing.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleGlobeClick = useCallback(
    ({ lat, lng }: { lat: number; lng: number }) => {
      if (phase !== 'guessing') return
      setGuess({ lat, lng })
    },
    [phase],
  )

  const submitGuess = useCallback(() => {
    if (!guess || !round || !answer) return
    const s = scoreRound(guess, answer, round.difficulty)
    setResults((prev) => [
      ...prev,
      { round, guess, distanceKm: s.distanceKm, points: s.points, base: s.base, multiplier: s.multiplier },
    ])
    setPhase('revealed')
  }, [guess, round, answer])

  const next = useCallback(() => {
    if (index + 1 >= run.rounds.length) {
      setPhase('done')
      return
    }
    setIndex((i) => i + 1)
    setGuess(null)
    setPhase('guessing')
  }, [index, run.rounds.length])

  const restart = useCallback(() => {
    setIndex(0)
    setGuess(null)
    setResults([])
    setPhase('guessing')
  }, [])

  // Persist a freshly-completed daily to the browser (locks it for the rest of the day).
  useEffect(() => {
    if (phase !== 'done' || run.mode !== 'daily' || playedEarlier || saved) return
    if (results.length !== run.rounds.length) return
    const data: SavedDaily = {
      dateKey: run.dateKey,
      total: results.reduce((sum, r) => sum + r.points, 0),
      rounds: results.map(toSavedRound),
    }
    saveDaily(data)
    setSaved(data)
  }, [phase, run.mode, run.dateKey, run.rounds.length, playedEarlier, saved, results])

  const total = results.reduce((sum, r) => sum + r.points, 0)
  const lastResult = results[results.length - 1]

  // Markers on the globe.
  const points: PointDatum[] = useMemo(() => {
    const pts: PointDatum[] = []
    if (guess) pts.push({ ...guess, color: GUESS_COLOR, label: 'Your guess', size: 0.6 })
    if (phase === 'revealed' && answer)
      pts.push({ ...answer, color: ANSWER_COLOR, label: round?.name ?? 'Answer', size: 0.8 })
    return pts
  }, [guess, phase, answer, round])

  const arcs = useMemo(() => {
    if (phase === 'revealed' && guess && answer)
      return [
        {
          startLat: guess.lat,
          startLng: guess.lng,
          endLat: answer.lat,
          endLng: answer.lng,
        },
      ]
    return []
  }, [phase, guess, answer])

  if (phase === 'done') {
    const maxPossible = run.rounds.reduce(
      (s, r) => s + 100 * DIFFICULTY_MULTIPLIER[r.difficulty],
      0,
    )
    // Render from saved data when present (prior play), else from the live run.
    const summary: SavedRound[] = saved ? saved.rounds : results.map(toSavedRound)
    const finalTotal = saved ? saved.total : total
    const isDaily = run.mode === 'daily'
    const shareText = formatDailyShare(
      run.dateKey,
      summary.map((s) => s.base),
      finalTotal,
    )

    const onShare = async () => {
      try {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        setCopied(false)
      }
    }

    return (
      <div className="gg-done">
        <h1>{playedEarlier ? "Today's result" : 'Final score'}</h1>
        <p className="gg-total">
          {finalTotal}
          <span className="gg-outof"> / {maxPossible}</span>
        </p>
        <ul className="gg-summary">
          {summary.map((r, i) => (
            <li key={i}>
              <span className="gg-city">{r.name}</span>
              <span className="gg-dist">{Math.round(r.distanceKm).toLocaleString()} km</span>
              <span className="gg-base">
                {r.base}/100 ×{r.multiplier}
              </span>
              <span className="gg-pts">+{r.points}</span>
            </li>
          ))}
        </ul>

        {isDaily ? (
          <div className="gg-share">
            <pre className="gg-share-text">{shareText}</pre>
            <button className="gg-btn gg-btn-primary" onClick={onShare}>
              {copied ? 'Copied!' : 'Share result'}
            </button>
            <p className="gg-comeback">Come back tomorrow for a new daily.</p>
          </div>
        ) : (
          <button className="gg-btn gg-btn-primary" onClick={restart}>
            Play again
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="gg-root">
      <div className="gg-globe" ref={wrapRef}>
        {Globe ? (
          <Globe
            ref={globeRef}
            width={size.w}
            height={size.h}
            globeImageUrl={EARTH_TEXTURE}
            backgroundColor="rgba(0,0,0,0)"
            onGlobeClick={handleGlobeClick}
            pointsData={points}
            pointLat={(d: object) => (d as PointDatum).lat}
            pointLng={(d: object) => (d as PointDatum).lng}
            pointColor={(d: object) => (d as PointDatum).color}
            pointAltitude={0.02}
            pointRadius={(d: object) => (d as PointDatum).size}
            pointLabel={(d: object) => (d as PointDatum).label}
            arcsData={arcs}
            arcColor={() => [GUESS_COLOR, ANSWER_COLOR]}
            arcStroke={0.6}
            arcDashLength={0.4}
            arcDashGap={0.15}
            arcDashAnimateTime={1500}
          />
        ) : (
          <div className="gg-loading">Loading globe…</div>
        )}
      </div>

      <div className="gg-hud">
        <div className="gg-top">
          <span className="gg-run-title">{run.title}</span>
          <span className="gg-progress">
            Round {index + 1} / {run.rounds.length} · Score {total}
          </span>
        </div>

        {phase === 'guessing' && round && (
          <div className="gg-panel">
            <div className="gg-prompt">
              Find: <strong>{round.country ? `${round.name}, ${round.country}` : round.name}</strong>
              <span className={`gg-diff gg-diff-${round.difficulty}`}>
                {round.difficulty} ×{DIFFICULTY_MULTIPLIER[round.difficulty]}
              </span>
            </div>
            <div className="gg-hint">
              {guess ? 'Tap again to adjust, then submit.' : 'Tap the globe where you think it is.'}
            </div>
            <button className="gg-btn gg-btn-primary" disabled={!guess} onClick={submitGuess}>
              Submit guess
            </button>
          </div>
        )}

        {phase === 'revealed' && lastResult && (
          <div className="gg-panel">
            <div className="gg-result">
              <span className="gg-result-city">{lastResult.round.name}</span>
              <span className="gg-result-score">
                <span className="gg-result-base">{lastResult.base} / 100</span>
                <span className="gg-result-mult">×{lastResult.multiplier}</span>
                <span className="gg-result-arrow">→</span>
                <span className="gg-result-pts">+{lastResult.points}</span>
              </span>
            </div>
            <div className="gg-result-dist">
              {Math.round(lastResult.distanceKm).toLocaleString()} km away
            </div>
            {lastResult.round.fact && <p className="gg-fact">{lastResult.round.fact}</p>}
            <button className="gg-btn gg-btn-primary" onClick={next}>
              {index + 1 >= run.rounds.length ? 'See results' : 'Next round'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
