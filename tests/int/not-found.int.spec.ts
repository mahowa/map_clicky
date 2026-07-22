import { describe, it, expect, afterEach } from 'vitest'
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import NotFound from '@/app/(frontend)/not-found'

afterEach(cleanup)

describe('branded 404 (#29)', () => {
  it('renders the TerraTap-styled 404 headline', () => {
    render(React.createElement(NotFound))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('404')
  })

  it('routes the player back into the game', () => {
    render(React.createElement(NotFound))
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(links).toContain('/')
    expect(links).toContain('/play')
    expect(links).toContain('/quizzes')
  })

  it('explains the dead end in the game voice', () => {
    render(React.createElement(NotFound))
    expect(screen.getByText(/lost at sea/i)).toBeTruthy()
  })
})
