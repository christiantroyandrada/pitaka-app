# ADR 12: No Redux: hand-rolled stores via useSyncExternalStore

**Status:** Accepted
**Date:** 2026-07-30

## Context

The app's entire state surface is a ledger, a login session, and config flags. `balanceOf` in `src/domain/ledger.ts` derives balances from entries, so there's nothing to normalise or cache. Redux, or even Zustand, would be the heaviest dependency in the project for that.

The domain layer also has to travel. Later phases put two Vite + React H5 apps in separate repos, and the money and ledger modules are the ones they will need. Keeping them React-free and library-free means that becomes a copy or a published package, not a port.

## Decision

`src/data/walletStore.ts` exports `createWalletStore()`: a closure over `entries` plus a `Set` of listeners, returning `getEntries`, `getBalance`, `transfer`, `subscribe`. No React import. Components subscribe through React's built-in `useSyncExternalStore` (`src/app/home.tsx`, `src/app/transactions.tsx`). zod is the only non-Expo, non-React-Native library dependency.

Entries are replaced wholesale (`entries = [...entries, ...result.entries]`), never pushed into. React compares snapshots by reference, so an in-place mutation would render nothing. That is the inverse of Pinia, where mutating reactive state is the normal path; the habit doesn't carry over.

## Consequences

There are no devtools and no middleware layer, and no time-travel debugging. `getSnapshot` must return a referentially stable value or React re-renders forever, so any selector that builds an object needs hand-memoising. A footgun I carry instead of one the library absorbs. Cross-store coordination would be manual.

## When this would change

At around five interdependent slices, or the first time two stores must read each other's state to compute a value. Also if logging, persistence, or optimistic rollback needs to wrap writes in more than one place. Zustand is the next step, since it keeps the plain-TS shape; Redux only if a team wants the devtools.

*Draft. Revise in my own words before treating this as final.*
