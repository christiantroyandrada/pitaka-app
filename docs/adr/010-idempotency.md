# ADR 10: Idempotency keys on every money mutation

**Status:** Accepted
**Date:** 2026-07-30

## Context

Retries are normal in a wallet: flaky networks, impatient taps, app restarts mid-request. The mutation has to be safe to repeat. The usual answer is a table of seen keys, which means another store to keep consistent with the ledger and to rehydrate after a restart. On mobile that store is the first thing to go.

## Decision

`TransferRequest` in `src/domain/transfer.ts` requires `idempotencyKey`, and `txIdFor` derives the transaction id from it (`tx:<key>`). Replay detection is then a read of the ledger itself: `applyTransfer` calls `entriesForTx(entries, txId)` and, if entries exist, returns `{ ok: true, txId, entries: [] }` without writing. `createWalletStore.transfer` only appends and notifies when `result.entries.length > 0`, so a replay produces no spurious re-render.

Same key with a different amount returns `IDEMPOTENCY_KEY_REUSED` rather than the original receipt. A stale receipt for an amount the user never sent is a worse failure than a visible error.

Two layers, because they guard different things. The key protects the ledger. A separate `submitted` ref in `SendMoneyForm.tsx` protects navigation: the double press was already harmless to the balance, but it fired `onDone` twice and popped two screens. Both are covered by tests ("replaying the same key does not move money twice", "double-pressing Send completes the flow only once").

## Consequences

Idempotency is derivable from persisted state alone, with no side store. The cost: txIds are guessable and carry client-chosen input, so a real backend must namespace keys per account and reject malformed ones. Callers must also hold a key across retries — `SendMoneyForm` keeps one in a ref for the mount, which means a remount is treated as a new intent.

## When this would change

If a server issues transaction ids, the derivation goes away and `applyTransfer` needs an explicit key index. If keys ever become user-visible or cross accounts, they get hashed and namespaced. If a mutation needs the original receipt on key reuse rather than a refusal, the reuse branch splits by operation type.

*Draft — revise in my own words before treating this as final.*
