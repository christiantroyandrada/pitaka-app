# Pitaka

*Pitaka*. Filipino for wallet.

A mock e-wallet super-app, built to learn React Native and to work through the
architecture of a Philippine e-wallet end to end: a native host shell, H5
microfrontends in WebViews, a typed JS bridge between them, and
remote-config-driven feature gating.

**No real money, no real credentials, nothing proprietary.** Balances are fake
and openly so. The domain modelling is real though: integer centavos, an
append-only ledger, and idempotent money movement.

## Status

**P0 done, P1 started.** Runs in Expo Go. No Firebase, no server, no native
modules of my own.

| Layer | State |
|---|---|
| Money, ledger, transfers | Done |
| Config parsing and tile resolution | Done |
| Wallet store | Done |
| Screens (login, home, send, transactions) | Done |
| Typed JS bridge, WebView container, one H5 page | Built, in this repo rather than their own |
| Firebase Remote Config | Not started |
| BFF with request signing, second H5 app, VPS deploy | Not started |

210 tests across 20 suites, strict TypeScript, CI on every push.

The bridge and the H5 page live here for now. They move to their own repos when
there are two H5 apps to keep honest, which is the whole argument of
[ADR 1](docs/adr/001-multi-repo.md).

**Two gaps worth stating plainly.** `react-native-webview` has no web build and
this machine has no simulator, so the native transport is unverified on a
device. `src/bridge/loopback.test.ts` drives both sides through the real JSON
injection boundary, including a ledger debit from an H5-initiated payment, but
it wires up `src/bridge/client.ts` — and the Bills page ships its own
hand-written client, because it has no build step and can't import from `src/`.
So the untested links are react-native-webview's postMessage plumbing and that
copy of the client. `src/bridge/h5Page.test.ts` only string-matches the page to
catch the wire constants drifting apart.

## Three decisions worth the click

**Money is always integer centavos.** No float ever represents money, and
parsing is string-based. Routing `0.29` through a float can't represent it
exactly, and that's where a rounding bug would enter the ledger.

**Balances are derived, never stored.** A balance is `SUM(amount_centavos)` over
an account's ledger entries. Every movement writes entries summing to zero
across accounts, including the seeded opening balance. One assertion catches any
half-written transaction: the whole ledger sums to zero.

**Feature flags fail closed.** The tile resolver is a pure function from config
plus flags to a navigation decision. A flag value that can't be parsed hides
the feature rather than showing it, because a parse error should never be the
reason something gated ships.

## Run it

```bash
pnpm install
pnpm start
```

Open in Expo Go. Log in with mobile `917 123 4567`, MPIN `123456`.

The same dev server serves the H5 pages out of `public/`, addressed by whatever
host your device reached Metro on, so Bills works on a handset and not just in a
simulator. Bills is the only H5 tile enabled: the others are real entries in the
grid config with `enabled: false`, because their H5 app isn't built yet and a
tile with no page behind it is a dead end. Turning one on is what shipping its
H5 app looks like.

## Test

```bash
pnpm test
pnpm typecheck
```

## Docs

- [Design spec](docs/superpowers/specs/), architecture, bridge contract, threat model
- [P0 plan](docs/superpowers/plans/). Task-by-task, TDD, with the scaffold gotchas recorded
- Architecture decision records land in `docs/adr/` as each decision survives implementation
