# ADR 9: Integer centavos and an append-only ledger

**Status:** Accepted
**Date:** 2026-07-30

## Context

Pitaka moves PHP amounts. Two failure classes make float money unacceptable in a wallet. First, representation: `0.29` has no exact binary double, so `0.29 * 100` and any rounding step built on it will eventually be off by a centavo. Second, reconciliation: systems that keep a mutable balance column alongside a transaction list can disagree with themselves, and once they do, there is no ground truth to recover from. A wallet that cannot prove its own balance is not a wallet.

## Decision

`Centavos` in `src/domain/money.ts` is an integer count of centavos. No float ever represents money. `parseAmountToCentavos` is string-based on purpose: it matches `/^\d+(\.\d{1,2})?$/`, splits on the decimal point, pads the fraction, and does integer arithmetic. `formatCentavos` goes the other way with `Math.trunc` and `%`.

`src/domain/ledger.ts` stores `LedgerEntry` records and nothing else. `balanceOf` derives a balance by summing entries for an account; there is no stored balance anywhere, including in `walletStore`, which calls `balanceOf` on read.

Every movement writes entries summing to zero. `applyTransfer` in `transfer.ts` emits a debit/credit pair. `seedEntries` in `src/data/seed.ts` credits `user:1` and debits `funding:external` for the same opening amount, so the demo's starting money is funded, not conjured. That gives one global invariant, `isZeroSum`, which catches any half-written transaction regardless of which code path wrote it.

## Consequences

Balances cost O(entries) per read. That is fine at demo scale and would not be at production scale, where the answer is a periodic snapshot plus entries since, never a mutable column. Callers must pass centavos, so every UI boundary needs an explicit parse, and `parseAmountToCentavos` returning `null` has to be handled rather than coerced.

## When this would change

Snapshot the ledger when a single account exceeds roughly 10,000 entries or `balanceOf` shows up in a render profile. Move off `number` to `bigint` if any amount can exceed 2^53 centavos (about 90 trillion pesos) or if multi-currency or sub-centavo interest accrual is added, at which point centavos stops being the smallest unit.

*Draft — revise in my own words before treating this as final.*
