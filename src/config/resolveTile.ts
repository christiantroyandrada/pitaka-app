import { z } from 'zod'
import type { Tile } from './schema'

export type NavIntent = { kind: 'native'; route: string } | { kind: 'h5'; url: string }
export type Flags = Record<string, string>

/** Flag values arrive as stringified JSON objects, not booleans. */
const greylistSchema = z.object({ enabled: z.boolean() })

/**
 * Fail closed: an unreadable or wrong-shaped flag hides the tile rather than
 * exposing it. A parse error must never be the reason a gated feature ships.
 */
function greylistAllows(flags: Flags, tileKey: string): boolean {
  const raw = flags[`greylisting_${tileKey}`]
  if (raw === undefined) return true

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return false
  }

  const parsed = greylistSchema.safeParse(json)
  return parsed.success ? parsed.data.enabled : false
}

/**
 * Config in, navigation decision out. Pure — no I/O, no navigation side effects
 * — which is what makes the whole config-driven grid testable without a device.
 */
export function resolveTile(tile: Tile, flags: Flags, h5BaseUrl: string): NavIntent | null {
  if (!tile.enabled) return null
  if (!greylistAllows(flags, tile.key)) return null

  if (tile.type === 'native') return { kind: 'native', route: tile.target }

  const base = h5BaseUrl.replace(/\/+$/, '')
  return { kind: 'h5', url: `${base}/h5/${tile.target}/` }
}
