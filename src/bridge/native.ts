import { maskMobile, type HandlerSet } from './methods'
import { BridgeMethodError, PROTOCOL_VERSION } from './envelope'
import { SEED_USER } from '@/data/seed'
import type { WalletStore } from '@/data/walletStore'

/**
 * The real handler set. Money moves through the same ledger the native screens
 * use, so an H5 payment and a native Send are the same operation underneath.
 */
export function createNativeHandlers(store: WalletStore, flags: Record<string, string> = {}): HandlerSet {
  return {
    getEnvInfo: () => ({ platform: 'native', appVersion: '1.0.0', bridgeVersion: PROTOCOL_VERSION }),

    // The WebView gets a masked number. It never needs the real one.
    getProfile: () => ({
      userId: SEED_USER.id,
      displayName: SEED_USER.displayName,
      maskedMobile: maskMobile(SEED_USER.mobile),
    }),

    getFlags: ({ keys }) =>
      keys.reduce<Record<string, string>>((acc, k) => {
        if (flags[k] !== undefined) acc[k] = flags[k]
        return acc
      }, {}),

    toast: () => undefined,

    requestPayment: ({ amountCentavos, billerId, idempotencyKey }) => {
      const result = store.transfer({
        to: `biller:${billerId}`,
        amountCentavos,
        idempotencyKey,
      })
      if (!result.ok) {
        const message =
          result.code === 'INSUFFICIENT_FUNDS' ? 'not enough balance' : 'could not pay'
        throw new BridgeMethodError(result.code, message)
      }
      return { transactionId: result.txId, status: 'completed' }
    },
  }
}
