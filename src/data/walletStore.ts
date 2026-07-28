import { balanceOf, type AccountId, type LedgerEntry } from '../domain/ledger'
import { applyTransfer, type TransferResult } from '../domain/transfer'
import { ACCOUNTS, seedEntries } from './seed'

export type StoreTransferRequest = {
  to: AccountId
  amountCentavos: number
  idempotencyKey: string
}

export type WalletStore = {
  getEntries: () => LedgerEntry[]
  getBalance: (accountId: AccountId) => number
  transfer: (req: StoreTransferRequest) => TransferResult
  subscribe: (listener: () => void) => () => void
}

export function createWalletStore(initial: LedgerEntry[] = seedEntries()): WalletStore {
  // Replaced wholesale on change, never mutated — so the reference is stable
  // between changes and useSyncExternalStore can bail out of re-rendering.
  let entries: LedgerEntry[] = [...initial]
  const listeners = new Set<() => void>()

  const notify = () => listeners.forEach((l) => l())

  const getEntries = () => entries
  const getBalance = (accountId: AccountId) => balanceOf(entries, accountId)

  const transfer = (req: StoreTransferRequest): TransferResult => {
    const result = applyTransfer(
      entries,
      {
        from: ACCOUNTS.user,
        to: req.to,
        amountCentavos: req.amountCentavos,
        idempotencyKey: req.idempotencyKey,
      },
      new Date().toISOString(),
    )

    // A replay succeeds but writes nothing, so there is no state change to
    // announce — subscribers only hear about real ledger movement.
    if (result.ok && result.entries.length > 0) {
      entries = [...entries, ...result.entries]
      notify()
    }

    return result
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return { getEntries, getBalance, transfer, subscribe }
}
