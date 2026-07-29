import { createWalletStore } from './walletStore'

/**
 * The one store the running app uses. Tests never import this — they call
 * createWalletStore() so each test gets an isolated ledger.
 */
export const walletStore = createWalletStore()
