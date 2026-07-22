'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MlMap, Marker as MlMarker, StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { scoreRound, type LatLng, DIFFICULTY_MULTIPLIER } from '@/lib/scoring'
import type { GameRun, Round } from '@/lib/game-types'
import { formatDailyShare, playUrlFromLocation } from '@/lib/share'
import { pickReaction, pickVerdict } from '@/lib/reactions'
import { cameraActionFor, pairBounds } from '@/lib/camera'
import {
  countryAt,
  countryFeatureAt,
  describeMiss,
  type CountryGeometry,
} from '@/lib/country-lookup'
import { SPEED_ROUND_SECONDS, expiryAction, formatDuration } from '@/lib/speed'

const GUESS_COLOR = '#38bdf8' // sky-400
const ANSWER_COLOR = '#34d399' // emerald-400

// ESRI World Imagery: free, key-less, label-free satellite tiles with deep zoom
// (sub-meter to ~z19). No place names → fair guessing. Attribution is required
// and shown via MapLibre's attribution control. History mode (#4) overlays
// Esri's boundaries+places reference tiles — there the puzzle is the history,
// not the unlabeled map.
function buildMapStyle(labeled: boolean): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: [
          'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      },
    },
    layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
  }
  if (labeled) {
    style.sources.labels = {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Labels © Esri',
    }
    style.layers.push({ id: 'labels', type: 'raster', source: 'labels' })
  }
  return style
}

const LINE_SOURCE = 'gg-line'
const REGION_SOURCE = 'gg-region'

// Neutral full-globe framing the game starts from. Applied after the globe
// projection is active (the mercator→globe switch otherwise inflates zoom).
// Later rounds keep the player's current view (see cameraActionFor, issue #7).
const GLOBE_VIEW: { center: [number, number]; zoom: number } = { center: [0, 20], zoom: 0.9 }

/** A small colored dot marker element for guess/answer. */
function markerEl(color: string): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = `width:16px;height:16px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.45);`
  return el
}

type Phase = 'guessing' | 'revealed' | 'done'

type RoundResult = {
  round: Round
  /** null = the speed-run clock expired with no guess placed. */
  guess: LatLng | null
  distanceKm: number | null
  points: number
  base: number
  multiplier: number
  reaction: string
  /** Country the guess landed in (null = ocean/uncovered); shown on misses (#2). */
  guessCountry: string | null
  /** Country containing the answer, from the same dataset so names compare cleanly. */
  answerCountry: string | null
  /** Geometry of the answer's country, highlighted on the globe on reveal (#6). */
  answerRegion: CountryGeometry | null
}

/** Serializable per-round result persisted to the browser for the daily lock. */
type SavedRound = {
  name: string
  base: number
  multiplier: number
  points: number
  /** null = timed out with no guess. */
  distanceKm: number | null
}
type SavedDaily = { dateKey: string; total: number; rounds: SavedRound[] }

const storageKey = (dateKey: string) => `terratap:daily:${dateKey}`
/** Pre-rename key (issue #8) — read as a fallback so an in-flight day isn't lost. */
const legacyStorageKey = (dateKey: string) => `mapclippy:daily:${dateKey}`

function loadSavedDaily(dateKey: string): SavedDaily | null {
  if (typeof window === 'undefined' || !dateKey) return null
  try {
    const raw =
      window.localStorage.getItem(storageKey(dateKey)) ??
      window.localStorage.getItem(legacyStorageKey(dateKey))
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
  const [ready, setReady] = useState(false)
  // Daily lock: result loaded from / saved to the browser, and whether it was a prior day's play.
  const [saved, setSaved] = useState<SavedDaily | null>(null)
  const [playedEarlier, setPlayedEarlier] = useState(false)
  const [copied, setCopied] = useState(false)
  // Speed run (#9): ms left on the current round's clock, and total play time.
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markersRef = useRef<MlMarker[]>([])
  const clickRef = useRef<(p: { lng: number; lat: number }) => void>(() => {})
  const expireRef = useRef<() => void>(() => {})
  const roundStartRef = useRef<number>(0)

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
  const answer: LatLng | null = useMemo(
    () => (round ? { lat: round.lat, lng: round.lng } : null),
    [round],
  )

  const handleGlobeClick = useCallback(
    ({ lat, lng }: { lat: number; lng: number }) => {
      if (phase !== 'guessing') return
      setGuess({ lat, lng })
    },
    [phase],
  )
  // Keep the map's click handler pointing at the latest closure (avoids stale phase).
  useEffect(() => {
    clickRef.current = handleGlobeClick
  }, [handleGlobeClick])

  // Initialize the MapLibre globe once. Dynamic import keeps WebGL/window off SSR.
  useEffect(() => {
    if (!wrapRef.current) return
    let map: MlMap | null = null
    let cancelled = false
    import('maplibre-gl').then(({ Map }) => {
      if (cancelled || !wrapRef.current) return
      map = new Map({
        container: wrapRef.current,
        style: buildMapStyle(!!run.labeled),
        center: GLOBE_VIEW.center,
        zoom: GLOBE_VIEW.zoom,
        attributionControl: { compact: true },
        maxPitch: 0,
        dragRotate: false,
      })
      mapRef.current = map
      ;(window as unknown as Record<string, unknown>).__mc_map = map
      map.on('style.load', () => {
        map?.setProjection({ type: 'globe' })
        // Re-apply after the projection switch so the start view is a full globe.
        map?.jumpTo(GLOBE_VIEW)
      })
      map.on('load', () => setReady(true))
      map.on('click', (e) => clickRef.current({ lng: e.lngLat.lng, lat: e.lngLat.lat }))
    })
    const el = wrapRef.current
    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(el)
    return () => {
      cancelled = true
      ro.disconnect()
      map?.remove()
      mapRef.current = null
    }
  }, [run.labeled])

  // Draw guess/answer markers + the connecting line, and frame the camera.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    const add = (p: LatLng, color: string) => {
      import('maplibre-gl').then(({ Marker }) => {
        if (!mapRef.current) return
        const mk = new Marker({ element: markerEl(color), anchor: 'center' })
          .setLngLat([p.lng, p.lat])
          .addTo(map)
        markersRef.current.push(mk)
      })
    }
    if (guess) add(guess, GUESS_COLOR)
    if (phase === 'revealed' && answer) add(answer, ANSWER_COLOR)

    // Answer's country region: shown while revealed so the player sees how close
    // or far they were from the right area (#6); cleared for the next round.
    const regionGeom =
      phase === 'revealed' ? (results[results.length - 1]?.answerRegion ?? null) : null
    const regionData = {
      type: 'FeatureCollection' as const,
      features: regionGeom
        ? [{ type: 'Feature' as const, properties: {}, geometry: regionGeom }]
        : [],
    }
    const regionSrc = map.getSource(REGION_SOURCE) as
      | { setData?: (d: unknown) => void }
      | undefined
    if (regionSrc?.setData) {
      regionSrc.setData(regionData)
    } else {
      map.addSource(REGION_SOURCE, { type: 'geojson', data: regionData })
      map.addLayer({
        id: `${REGION_SOURCE}-fill`,
        type: 'fill',
        source: REGION_SOURCE,
        paint: { 'fill-color': ANSWER_COLOR, 'fill-opacity': 0.15 },
      })
      map.addLayer({
        id: `${REGION_SOURCE}-outline`,
        type: 'line',
        source: REGION_SOURCE,
        paint: { 'line-color': ANSWER_COLOR, 'line-width': 1.5, 'line-opacity': 0.8 },
      })
    }

    const showLine = phase === 'revealed' && guess && answer
    const data = {
      type: 'FeatureCollection' as const,
      features: showLine
        ? [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: {
                type: 'LineString' as const,
                coordinates: [
                  [guess.lng, guess.lat],
                  [answer.lng, answer.lat],
                ],
              },
            },
          ]
        : [],
    }
    const src = map.getSource(LINE_SOURCE) as { setData?: (d: unknown) => void } | undefined
    if (src?.setData) {
      src.setData(data)
    } else {
      map.addSource(LINE_SOURCE, { type: 'geojson', data })
      map.addLayer({
        id: LINE_SOURCE,
        type: 'line',
        source: LINE_SOURCE,
        paint: { 'line-color': GUESS_COLOR, 'line-width': 2, 'line-dasharray': [2, 1.5] },
      })
    }

    // Camera: frame the reveal pair, otherwise stay put — new rounds keep the
    // player's current view instead of zooming back out to the full globe (#7).
    if (cameraActionFor(phase, guess, answer) === 'fit-pair' && guess && answer) {
      map.fitBounds(pairBounds(guess, answer), { padding: 120, maxZoom: 5, duration: 900 })
    }
  }, [ready, guess, phase, answer, results])

  const submitGuess = useCallback(async () => {
    if (!guess || !round || !answer || phase !== 'guessing') return
    if (run.timed && roundStartRef.current) {
      setElapsedMs((e) => e + (Date.now() - roundStartRef.current))
    }
    const s = scoreRound(guess, answer, round.difficulty)
    // Both looked up in the same offline dataset so the names compare cleanly.
    const [guessCountry, answerFeature] = await Promise.all([
      countryAt(guess),
      countryFeatureAt(answer),
    ])
    const answerCountry = answerFeature?.properties.name ?? null
    const answerRegion = answerFeature?.geometry ?? null
    setResults((prev) => [
      ...prev,
      {
        round,
        guess,
        distanceKm: s.distanceKm,
        points: s.points,
        base: s.base,
        multiplier: s.multiplier,
        reaction: pickReaction(s.base),
        guessCountry,
        answerCountry,
        answerRegion,
      },
    ])
    setPhase('revealed')
  }, [guess, round, answer, phase, run.timed])

  // Speed-run clock hit zero with no guess placed: score the round as a zero.
  const timeoutRound = useCallback(async () => {
    if (!round || !answer || phase !== 'guessing') return
    if (roundStartRef.current) {
      setElapsedMs((e) => e + (Date.now() - roundStartRef.current))
    }
    const answerFeature = await countryFeatureAt(answer)
    setResults((prev) => [
      ...prev,
      {
        round,
        guess: null,
        distanceKm: null,
        points: 0,
        base: 0,
        multiplier: DIFFICULTY_MULTIPLIER[round.difficulty],
        reaction: '⏰ Time ran out before you pulled the trigger.',
        guessCountry: null,
        answerCountry: answerFeature?.properties.name ?? null,
        answerRegion: answerFeature?.geometry ?? null,
      },
    ])
    setPhase('revealed')
  }, [round, answer, phase])

  // Keep the expiry handler pointing at the latest closures (same pattern as clickRef).
  useEffect(() => {
    expireRef.current = () => {
      if (expiryAction(!!guess) === 'submit') void submitGuess()
      else void timeoutRound()
    }
  }, [guess, submitGuess, timeoutRound])

  // Arm the countdown at each timed round's start; tick every 100ms; act on expiry.
  useEffect(() => {
    if (!run.timed || phase !== 'guessing' || !ready || !round) return
    roundStartRef.current = Date.now()
    const deadline = Date.now() + SPEED_ROUND_SECONDS * 1000
    setRemainingMs(SPEED_ROUND_SECONDS * 1000)
    const id = window.setInterval(() => {
      const left = deadline - Date.now()
      if (left <= 0) {
        window.clearInterval(id)
        setRemainingMs(0)
        expireRef.current()
      } else {
        setRemainingMs(left)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [run.timed, phase, ready, round])

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
    setElapsedMs(0)
    setRemainingMs(null)
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

  const maxPossible = run.rounds.reduce(
    (s, r) => s + 100 * DIFFICULTY_MULTIPLIER[r.difficulty],
    0,
  )
  // Final total + a one-line verdict, computed once per (stable) score so it
  // doesn't reshuffle on every results-screen re-render (e.g. the Share button).
  const finalTotal = saved ? saved.total : total
  const verdict = useMemo(
    () => pickVerdict(maxPossible ? Math.round((finalTotal / maxPossible) * 100) : 0),
    [finalTotal, maxPossible],
  )

  if (phase === 'done') {
    // Render from saved data when present (prior play), else from the live run.
    const summary: SavedRound[] = saved ? saved.rounds : results.map(toSavedRound)
    const isDaily = run.mode === 'daily'
    const shareText = formatDailyShare(
      run.dateKey,
      summary.map((s) => s.base),
      finalTotal,
      playUrlFromLocation(),
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
        <p className="gg-verdict">{verdict}</p>
        {run.timed && <p className="gg-time-total">Total time: {formatDuration(elapsedMs)}</p>}
        <ul className="gg-summary">
          {summary.map((r, i) => (
            <li key={i}>
              <div className="gg-summary-row">
                <span className="gg-city">{r.name}</span>
                <span className="gg-dist">
                  {r.distanceKm === null ? '—' : `${Math.round(r.distanceKm).toLocaleString()} km`}
                </span>
                <span className="gg-base">
                  {r.base}/100 ×{r.multiplier}
                </span>
                <span className="gg-pts">+{r.points}</span>
              </div>
              {run.rounds[i]?.fact && (
                <p className="gg-summary-fact">{run.rounds[i].fact}</p>
              )}
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
        {!ready && <div className="gg-loading">Loading globe…</div>}
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
            {run.timed && remainingMs !== null && (
              <div className={`gg-timer${remainingMs < 5000 ? ' gg-timer-low' : ''}`}>
                {Math.ceil(remainingMs / 1000)}s
              </div>
            )}
            {round.clue ? (
              <>
                <div className="gg-prompt">
                  Where did this happen?
                  <span className={`gg-diff gg-diff-${round.difficulty}`}>
                    {round.difficulty} ×{DIFFICULTY_MULTIPLIER[round.difficulty]}
                  </span>
                </div>
                <p className="gg-clue">{round.clue}</p>
              </>
            ) : (
              <div className="gg-prompt">
                Find:{' '}
                <strong>{round.country ? `${round.name}, ${round.country}` : round.name}</strong>
                <span className={`gg-diff gg-diff-${round.difficulty}`}>
                  {round.difficulty} ×{DIFFICULTY_MULTIPLIER[round.difficulty]}
                </span>
              </div>
            )}
            <div className="gg-hint">
              {guess
                ? 'Tap again to adjust, then submit.'
                : round.clue
                  ? 'Tap the globe where you think this took place.'
                  : 'Tap the globe where you think it is.'}
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
              {lastResult.distanceKm === null
                ? 'No guess placed in time.'
                : `${Math.round(lastResult.distanceKm).toLocaleString()} km away`}
            </div>
            {lastResult.guess !== null &&
              (() => {
                const miss = describeMiss(
                  lastResult.guessCountry,
                  lastResult.answerCountry,
                  lastResult.base,
                )
                return miss ? <p className="gg-miss-country">{miss}</p> : null
              })()}
            <p className="gg-reaction">{lastResult.reaction}</p>
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
