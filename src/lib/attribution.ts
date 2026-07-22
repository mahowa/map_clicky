/**
 * Map attribution handling (issue #25).
 *
 * MapLibre's compact attribution control mounts EXPANDED: a full-width pill of
 * "Imagery © Esri…" text along the map's bottom edge. On phones that bar wraps
 * to two lines and sits on top of the HUD's Submit button (the control carries
 * z-index above HUD siblings). Required attribution stays available behind the
 * standard ⓘ toggle — we just start it collapsed instead of open.
 */

/** MapLibre's compact attribution element inside a map container. */
const ATTRIB_SELECTOR = 'details.maplibregl-ctrl-attrib'

/** The class MapLibre toggles alongside the `open` attribute in compact mode. */
const SHOW_CLASS = 'maplibregl-compact-show'

/**
 * Collapse the map's compact attribution to its ⓘ toggle.
 * Returns true when an expanded control was found and collapsed.
 */
export function collapseAttribution(container: HTMLElement | null): boolean {
  const attrib = container?.querySelector<HTMLDetailsElement>(ATTRIB_SELECTOR)
  if (!attrib || !attrib.open) return false
  attrib.open = false
  attrib.classList.remove(SHOW_CLASS)
  return true
}
