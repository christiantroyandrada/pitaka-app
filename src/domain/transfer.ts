import type { Centavos } from './money'
import { balanceOf, entriesForTx, type AccountId, type LedgerEntry } from './ledger'

export type TransferRequest = {
  from: AccountId
  to: AccountId
  amountCentavos: Centavos
  idempotencyKey: string
}

export type TransferResult =
  | { ok: true; txId: string; entries: LedgerEntry[] }
  | { ok: false; code: 'INSUFFICIENT_FUNDS' | 'INVALID_AMOUNT' | 'IDEMPOTENCY_KEY_REUSED' }

/**
 * The transaction id is derived from the idempotency key, so a replay is
 * detectable from the ledger alone — there is no separate store to keep in sync
 * or to lose on restart.
 */
const txIdFor = (idempotencyKey: string): string => `tx:${idempotencyKey}`

export function applyTransfer(
  entries: LedgerEntry[],
  req: TransferRequest,
  now: string,
): TransferResult {
  const txId = txIdFor(req.idempotencyKey)
  const existing = entriesForTx(entries, txId)

  if (existing.length > 0) {
    // Same key, same operation → return the original outcome and write nothing.
    // Same key, different operation → refuse; silently succeeding would hide a
    // caller bug behind a stale receipt.
    // Matched by entry id, not by account, so a self-transfer still resolves to
    // the right leg. Payee is part of the comparison: same key and amount to a
    // different payee is a different operation, not a replay.
    const debit = existing.find((e) => e.id === `${txId}:debit`)
    const credit = existing.find((e) => e.id === `${txId}:credit`)
    const sameOperation =
      debit?.accountId === req.from &&
      credit?.accountId === req.to &&
      debit?.amountCentavos === -req.amountCentavos
    return sameOperation
      ? { ok: true, txId, entries: [] }
      : { ok: false, code: 'IDEMPOTENCY_KEY_REUSED' }
  }

  if (!Number.isInteger(req.amountCentavos) || req.amountCentavos <= 0) {
    return { ok: false, code: 'INVALID_AMOUNT' }
  }

  if (balanceOf(entries, req.from) < req.amountCentavos) {
    return { ok: false, code: 'INSUFFICIENT_FUNDS' }
  }

  return {
    ok: true,
    txId,
    entries: [
      {
        id: `${txId}:debit`,
        accountId: req.from,
        txId,
        amountCentavos: -req.amountCentavos,
        createdAt: now,
      },
      {
        id: `${txId}:credit`,
        accountId: req.to,
        txId,
        amountCentavos: req.amountCentavos,
        createdAt: now,
      },
    ],
  }
}
