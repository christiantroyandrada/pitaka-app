# ADR 12: No Redux: hand-rolled stores via useSyncExternalStore

**Status:** Accepted
**Date:** 2026-07-30

## Context

The app's entire state surface is a ledger, a login session, and config flags. `balanceOf` in `src/domain/ledger.ts` derives balances from entries, so there is nothing to normalise or cache. Redux, or even Zustand, would be the heaviest dependency in the project for that.

The domain layer also has to travel. Later phases put two Vite + React H5 apps in separate repos consuming the same money and ledger code. Anything React-flavoured or library-bound in the store turns that into a port rather than a copy.

## Decision

`src/data/walletStore.ts` exports `createWalletStore()`: a closure over `entries` plus a `Set` of listeners, returning `getEntries`, `getBalance`, `transfer`, `subscribe`. No React import. Components subscribe through React's built-in `useSyncExternalStore` (`src/app/home.tsx`, `src/app/transactions.tsx`). zod remains the only non-Expo runtime dependency.

Entries are replaced wholesale (`entries = [...entries, ...result.entries]`), never pushed into. React compares snapshots by reference, so an in-place mutation would render nothing. That is the inverse of Pinia, where mutating reactive state is the normal path; the habit does not carry over.

## Consequences

No devtools, no time-travel, no middleware layer. `getSnapshot` must return a referentially stable value or React re-renders forever, so any selector that builds an object needs hand-memoising — a footgun I carry instead of one the library absorbs. Cross-store coordination would be manual.

## When this would change

At around five interdependent slices, or the first time two stores must read each other's state to compute a value. Also if logging, persistence, or optimistic rollback needs to wrap writes in more than one place. Zustand is the next step, since it keeps the plain-TS shape; Redux only if a team wants the devtools.

*Draft — revise in my own words before treating this as final.*
