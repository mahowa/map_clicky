import { notFound } from 'next/navigation'

/**
 * Catch-all for unmatched URLs (issue #29). The app's routes live in route
 * groups with no root layout, so without this Next.js serves its unbranded
 * built-in 404 for stray paths. Explicit routes (frontend pages, /admin,
 * /api) always win over a catch-all; anything left over lands on the
 * branded not-found page.
 */
export default function CatchAll(): never {
  notFound()
}
