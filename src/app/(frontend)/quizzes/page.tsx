import React from 'react'
import Link from 'next/link'
import { QUIZZES } from '@/lib/quizzes'
import '../styles.css'
import './quizzes.css'

export const metadata = {
  title: 'Pop Quizzes',
  description:
    'Practice geography by region or continent — US state capitals, world capitals, big cities, and a quiz for every continent.',
}

const THEMES = ['Regions', 'Continents'] as const

export default function QuizzesPage() {
  return (
    <div className="qz-page">
      <div className="qz-inner">
        <Link className="qz-back" href="/">
          ← Terra Tap
        </Link>
        <h1 className="qz-title">Pop Quizzes</h1>
        <p className="qz-sub">
          Pick a test and practice as much as you like — five random places from its pool each
          run, no daily lock.
        </p>
        {THEMES.map((theme) => (
          <section key={theme}>
            <h2 className="qz-theme">{theme}</h2>
            <ul className="qz-grid">
              {QUIZZES.filter((q) => q.theme === theme).map((q) => (
                <li key={q.slug}>
                  <Link className="qz-card" href={`/quiz/${q.slug}`}>
                    <p className="qz-card-title">{q.title}</p>
                    <p className="qz-card-desc">{q.description}</p>
                    <span className="qz-card-count">{q.pool.length} places</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
