# Architecture decision records

Why things are the way they are. Each record states the decision, what it costs,
and what would make me change my mind.

Several decisions are deliberate departures from patterns I maintained in a
production super-app. Those are described as failure *classes*. No employer,
repository, host, or service is named anywhere in this repo.

| # | Decision | Phase |
|---|---|---|
| [1](001-multi-repo.md) | One repo per H5 microfrontend | Later |
| [2](002-bridge-timeouts.md) | Timeout-bounded bridge calls, client-side only | Later |
| [3](003-h5-owns-bridge-object.md) | The H5 owns the bridge object; native only delivers into it | Later |
| [4](004-native-owns-firebase.md) | Native owns Firebase; H5 receives flags through the bridge | Later |
| [5](005-native-signs-requests.md) | Native signs requests and hashes what it signs | Later |
| [6](006-bff-verifies.md) | The BFF verifies signatures rather than relaying them | Later |
| [7](007-session-identity.md) | Session identity is separate from transport integrity | Later |
| [8](008-origin-allowlist.md) | Config-supplied URLs are origin-allowlisted, enforced twice | Partly built |
| [9](009-integer-centavos-ledger.md) | Integer centavos and an append-only ledger | **Built** |
| [10](010-idempotency.md) | Idempotency keys on every money mutation | **Built** |
| [11](011-native-payment-ux.md) | Native owns the payment confirmation UX | Later |
| [12](012-no-redux.md) | No Redux: hand-rolled stores via `useSyncExternalStore` | **Built** |
| [13](013-config-driven-navigation.md) | Config-driven navigation by registry id, flags failing closed | **Built** |

Records for unbuilt phases are decisions made in advance, not descriptions of
existing code. The phase column says which is which. That's deliberate: an ADR
defending something that doesn't exist is worth less than one that admits it.
