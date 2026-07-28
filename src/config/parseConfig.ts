import { servicesGridSchema, type ServicesGrid } from './schema'
import { DEFAULT_GRID } from './defaults'

export { DEFAULT_GRID }
export type { ServicesGrid }

/**
 * Never throws. A malformed, unknown-shaped, or future-versioned payload
 * degrades to the bundled default rather than taking a render path down with
 * it — a bare JSON.parse here is how one bad flag value bricks a launch screen.
 */
export function parseServicesGrid(raw: string | undefined): {
  grid: ServicesGrid
  usedFallback: boolean
} {
  if (raw === undefined) return { grid: DEFAULT_GRID, usedFallback: true }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { grid: DEFAULT_GRID, usedFallback: true }
  }

  const parsed = servicesGridSchema.safeParse(json)
  return parsed.success
    ? { grid: parsed.data, usedFallback: false }
    : { grid: DEFAULT_GRID, usedFallback: true }
}
