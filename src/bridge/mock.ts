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
  const seen = new Map<string, { txId: string; amountCentavos: number }>()

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
    requestPayment: ({ idempotencyKey, amountCentavos }) => {
      // Mirrors the ledger's rule: same key and amount replays, same key with a
      // different amount is refused. Without the second branch an H5 would see
      // a stale receipt here for a charge that never happened on device.
      const existing = seen.get(idempotencyKey)
      if (existing) {
        if (existing.amountCentavos !== amountCentavos) {
          throw new BridgeMethodError('IDEMPOTENCY_KEY_REUSED', 'key reused with a different amount')
        }
        return { transactionId: existing.txId, status: 'completed' }
      }
      const txId = `tx:mock:${seen.size + 1}`
      seen.set(idempotencyKey, { txId, amountCentavos })
      return { transactionId: txId, status: 'completed' }
    },
  }

  return { ...base, ...overrides }
}
