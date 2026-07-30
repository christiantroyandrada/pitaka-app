import { maskMobile, type HandlerSet } from './methods'

/**
 * Fixture handlers so an H5 page runs in a plain browser with no simulator.
 * Deliberately in-memory: the point is a working surface, not a second wallet.
 */
export function createMockHandlers(
  overrides: Partial<HandlerSet> = {},
  flags: Record<string, string> = {},
): HandlerSet {
  const seen = new Map<string, string>()

  const base: HandlerSet = {
    getEnvInfo: () => ({ platform: 'browser-mock', appVersion: '0.0.0-mock', bridgeVersion: 1 }),
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
    requestPayment: ({ idempotencyKey }) => {
      // Same replay semantics as the ledger, so H5 retry code behaves the same
      // against the mock as against the device.
      const existing = seen.get(idempotencyKey)
      const transactionId = existing ?? `tx:mock:${seen.size + 1}`
      seen.set(idempotencyKey, transactionId)
      return { transactionId, status: 'completed' }
    },
  }

  return { ...base, ...overrides }
}
