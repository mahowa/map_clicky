import { describe, it, expect } from 'vitest'
import { collapseAttribution } from '@/lib/attribution'

/** A DOM mimicking MapLibre's mounted compact attribution control (#25). */
function mapContainer({ open = true, compactShow = true } = {}): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = `
    <div class="maplibregl-ctrl-bottom-right">
      <details class="maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-compact${compactShow ? ' maplibregl-compact-show' : ''}"${open ? ' open' : ''}>
        <summary class="maplibregl-ctrl-attrib-button" title="Toggle attribution"></summary>
        <div class="maplibregl-ctrl-attrib-inner">Imagery © Esri</div>
      </details>
    </div>`
  return container
}

describe('collapseAttribution (#25)', () => {
  it('collapses an expanded compact attribution to its toggle', () => {
    const container = mapContainer()
    expect(collapseAttribution(container)).toBe(true)
    const details = container.querySelector('details')!
    expect(details.open).toBe(false)
    expect(details.classList.contains('maplibregl-compact-show')).toBe(false)
  })

  it('keeps the control in the DOM — attribution stays reachable via the toggle', () => {
    const container = mapContainer()
    collapseAttribution(container)
    expect(container.querySelector('.maplibregl-ctrl-attrib-inner')?.textContent).toContain(
      'Esri',
    )
    expect(container.querySelector('summary')).not.toBeNull()
  })

  it('is a no-op on an already-collapsed control', () => {
    const container = mapContainer({ open: false, compactShow: false })
    expect(collapseAttribution(container)).toBe(false)
    expect(container.querySelector('details')!.open).toBe(false)
  })

  it('handles a container with no attribution control', () => {
    expect(collapseAttribution(document.createElement('div'))).toBe(false)
  })

  it('handles a null container (map not mounted yet)', () => {
    expect(collapseAttribution(null)).toBe(false)
  })
})
