import { maskMobile, type HandlerSet } from './methods'
import { BridgeMethodError, PROTOCOL_VERSION } from './envelope'

/**
 * Fixture handlers so an H5 page runs in a plain browser with no simulator.
 * Deliberately in-memory: the point is a working surface, not a second wallet.
 */
export function createMockHandlers(
  overrides: Partial<HandlerSet> = {},
  flags: Record<string, string> = {},
): HandlerSet {
  const seen = new Map<string, { txId: string; amountCentavos: number; billerId: string }>()

  const base: HandlerSet = {
    getEnvInfo: () => ({ platform: 'browser-mock', appVersion: '0.0.0-mock', bridgeVersion: PROTOCOL_VERSION }),
    getProfile: () => ({
      userId: 'user:mock',
      displayName: 'Mock User',
      maskedMobile: maskMobile('9171234567'),
    }),
    getFlags: ({ keys }) =>
      keys.reduce<Record<string, string>>((acc, k) => {
        if (flags[k] !== undefined) acc[k] = flags[k]
        return acc
      }, {}),
    toast: () => undefined,
    requestPayment: ({ idempotencyKey, amountCentavos, billerId }) => {
      // Mirrors the ledger's rule: a replay is the same key, amount AND payee.
      // Any other reuse is refused. Comparing only the amount would hand back a
      // stale receipt for a biller that was never paid.
      const existing = seen.get(idempotencyKey)
      if (existing) {
        if (existing.amountCentavos !== amountCentavos || existing.billerId !== billerId) {
          throw new BridgeMethodError(
            'IDEMPOTENCY_KEY_REUSED',
            'key reused for a different payment',
          )
        }
        return { transactionId: existing.txId, status: 'completed' }
      }
      const txId = `tx:mock:${seen.size + 1}`
      seen.set(idempotencyKey, { txId, amountCentavos, billerId })
      return { transactionId: txId, status: 'completed' }
    },
  }

  return { ...base, ...overrides }
}
