import React from 'react'
import Link from 'next/link'
import './styles.css'
import './home.css'

export const metadata = { title: 'Lost at sea' }

/**
 * Branded 404 (issue #29). Shared links are core to the game (daily share
 * text, versus challenge URLs, quiz links) — a typo'd or stale one should
 * land somewhere that looks like TerraTap and routes back into play, not
 * the framework's bare default.
 */
export default function NotFound() {
  return (
    <div className="mc-home">
      <div className="mc-hero">
        <h1 className="mc-logo">
          4<span>0</span>4
        </h1>
        <p className="mc-tag">
          Lost at sea. Whatever you were looking for isn&apos;t on this map.
        </p>
        <div className="mc-actions">
          <Link className="mc-cta mc-cta-primary" href="/">
            Main menu
          </Link>
          <Link className="mc-cta" href="/play">
            Play the Daily
          </Link>
          <Link className="mc-cta" href="/quizzes">
            Pop Quizzes
          </Link>
        </div>
      </div>
    </div>
  )
}
