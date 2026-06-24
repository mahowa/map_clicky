import React from 'react'
import Link from 'next/link'
import './styles.css'
import './home.css'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  return (
    <div className="mc-home">
      <div className="mc-hero">
        <h1 className="mc-logo">
          Map<span>Clippy</span>
        </h1>
        <p className="mc-tag">
          Find the world on a 3D globe. Race the clock, then battle head-to-head.
        </p>
        <div className="mc-actions">
          <Link className="mc-cta mc-cta-primary" href="/play">
            Play the Daily
          </Link>
        </div>
        <p className="mc-note">Tap where you think each place is. Closer = more points.</p>
      </div>
    </div>
  )
}
