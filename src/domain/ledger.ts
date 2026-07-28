import type { Centavos } from './money'

export type AccountId = string

/**
 * One side of a money movement. Entries are append-only — nothing in this
 * codebase ever mutates or deletes one.
 */
export type LedgerEntry = {
  id: string
  accountId: AccountId
  txId: string
  amountCentavos: Centavos
  createdAt: string
}

/** A balance is always derived. There is no stored balance column anywhere. */
export function balanceOf(entries: LedgerEntry[], accountId: AccountId): Centavos {
  return entries
    .filter((e) => e.accountId === accountId)
    .reduce((sum, e) => sum + e.amountCentavos, 0)
}

/**
 * Every money movement must sum to zero across accounts. A non-zero total means
 * a half-written transaction — the invariant worth asserting after any change.
 */
export function isZeroSum(entries: LedgerEntry[]): boolean {
  return entries.reduce((sum, e) => sum + e.amountCentavos, 0) === 0
}

export function entriesForTx(entries: LedgerEntry[], txId: string): LedgerEntry[] {
  return entries.filter((e) => e.txId === txId)
}
