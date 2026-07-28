# Pitaka — design

**Date:** 2026-07-27
**Status:** approved (design), pending implementation plan

*Pitaka* — Filipino for wallet.

A public, open-source mock e-wallet super-app that reproduces the architecture of a
Philippine e-wallet: a React Native host shell with native pages, React H5
microfrontends loaded in WebViews, a typed JS bridge between them, and Firebase
Remote Config driving which surface a service tile opens.

## Why this exists

Two goals, in priority order.

1. **Learn React and React Native by building.** The feature code is written by hand,
   not generated. Agent involvement is deliberately limited to rails — scaffolds, CI,
   test harnesses, and failing tests with typed interfaces.
2. **Demonstrate end-to-end ownership.** In fintech, framework proficiency is table
   stakes; domain knowledge and owned decisions are the seniority signal. Every
   significant choice gets an ADR written in the author's own words, including the
   places where this design deliberately departs from the reference implementation
   and why.

Non-goals: real money, production-grade security, feature parity with any real
wallet, or a deployable product. Money is fake and openly so.

## Reference material

The bridge contract, Remote Config conventions, and several UI behaviours are informed
by first-hand experience building a production H5 microfrontend that ran inside a
super-app WebView container. That experience is cited inline as *[ref]*, and the
deliberate departures from it are collected in
[Appendix A](#appendix-a--departures-from-the-reference).

Nothing proprietary is reproduced: no code, credentials, hostnames, application ids,
internal service names, or repository names. What carries over are architectural
patterns that are public, industry-standard super-app conventions — a native container
brokering capability for web microfrontends, remote-config-driven feature gating, and
delegated request signing. Every *[ref]* note describes a pattern or a class of
mistake, never an artifact.

## Repositories

Four repos, mirroring how super-app teams actually organise: one repo per H5 SPA, so
each microfrontend deploys independently.

| Repo | Contents | CI deploys |
|---|---|---|
| `pitaka-app` | Expo host app (native pages, bridge host, design tokens), mock API service, nginx + deploy infra, ADRs, this spec | mock API container + nginx config to VPS |
| `pitaka-bridge` | Bridge SDK: envelope types, H5 client, browser mock, shared contract test suite | git tags (consumed as pinned git dependency) |
| `pitaka-h5-bills` | Bills Pay SPA (Vite + React) | `fintech.ctaprojects.xyz/h5/bills/` |
| `pitaka-h5-rewards` | Rewards SPA (Vite + React) | `fintech.ctaprojects.xyz/h5/rewards/` |

`pitaka-bridge` is consumed by the H5 repos as a pinned git dependency
(`github:christiantroyandrada/pitaka-bridge#v1.2.0`) — no npm publishing needed.
Version pinning is the mechanism that makes contract drift visible: bumping the pin
is a deliberate act with a diff to review.

`pitaka-app` ships `scripts/dev-setup.sh`, which clones the sibling repos and starts
everything (Expo dev server, both H5 dev servers, mock API) so a contributor runs one
command in one repo and gets the whole system.

## Product scope

Seven surfaces. Native unless marked otherwise.

| Surface | Type | Behaviour |
|---|---|---|
| Login | native | Mobile number + 6-digit MPIN against a seeded user |
| Home | native | Balance card, Cash In, 8-tile service grid, "View all" |
| View All services | native | Categorised grid, entirely driven by Remote Config |
| Send Money | native | Recipient + amount + confirm, posts to mock API |
| Transactions | native | History list from mock API |
| Bills Pay | **H5** | Biller list + payment form; auth and payment via bridge |
| Rewards | **H5** | Points and perks; exists to prove two H5 teams deploy independently |

### The two demo set-pieces

**1. Remote Config flip.** Every tile in the grid comes from a Remote Config JSON
parameter. Changing a tile's `type` from `h5` to `native` in the Firebase console makes
the same tile open a native page instead of a WebView; setting `enabled: false` hides
it. No redeploy and no app-store round trip — a foreground or pull-to-refresh brings the
change through (see the fetch-interval note under Remote Config; this is not magic and
the spec does not pretend the default twelve-hour cache allows it). One interaction
demonstrates flags, routing, the bridge, and H5 hosting together.

**2. Bridge-mediated payment.** The Bills H5 page calls
`payments.requestPayment(...)`. A **native** confirmation sheet slides over the
WebView — the H5 never owns the money-confirmation UX and never sees a credential. On
confirm, the promise resolves back inside the H5 with a receipt. This is the reason
super-apps have bridges, in one flow.

## Architecture

```
┌──────────────────────────────────────── React Native host (Expo) ───────────────────┐
│  Native pages: Login · Home · View All · Send Money · Transactions                  │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────────────────┐  │
│  │ Remote Config    │  │ Bridge host       │  │ Native payment sheet             │  │
│  │ (Firebase SDK)   │  │ handler registry  │  │ (owns confirm UX)                │  │
│  └────────┬─────────┘  └─────────┬─────────┘  └──────────────────────────────────┘  │
│           │ flags                │ postMessage / injectJavaScript                   │
│  ┌────────▼────────────────────────▼────────────────────────────────────────────┐   │
│  │ WebView container (origin-allowlisted)                                       │   │
│  │   H5 SPA  ← pitaka-bridge H5 client (typed, timeout-bounded)               │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────────────────────┘
                                │ signed HTTP (headers from auth.signRequest)
                    ┌───────────▼────────────┐
                    │ mock API (BFF)         │  verifies signature, owns the ledger
                    │ fintech.…/api/         │
                    └────────────────────────┘
```

Three rules fall out of this shape and are enforced, not just documented:

- **Native owns all privileged capability.** Firebase SDK, signing keys, session, and
  payment confirmation live in the host. H5 asks; it never holds.
- **H5 is replaceable and origin-confined.** It is a static SPA at a URL, loaded by
  configuration. The WebView loads only exact origins on a compile-time allowlist,
  enforced in `onShouldStartLoadWithRequest` — which is what actually stops an H5 page
  from navigating itself somewhere off-allowlist that would then inherit a working
  bridge. CSP is a second layer, not the gate.
- **UI components never import the bridge.** Only feature-level screens do, through the
  typed service layer. Enforced by an eslint `no-restricted-imports` boundary. *[ref:
  in the reference repo, exactly one of ~15 UI components imported the bridge — an
  implicit boundary worth making explicit.]*

## The bridge (`pitaka-bridge`)

### Envelope

```ts
// H5 → native
type Request = { id: string; v: 1; method: string; params?: unknown }

// native → H5
type Response =
  | { id: string; ok: true;  result: unknown }
  | { id: string; ok: false; error: { code: ErrorCode; message: string } }

// native → H5, unsolicited
type Event = { v: 1; event: string; payload?: unknown }
```

`id` is a client-generated correlation id. Transport is
`window.ReactNativeWebView.postMessage(JSON.stringify(req))` upward and
`injectJavaScript` calling `window.__PITAKA_BRIDGE__._receive(json)` downward.

**The H5 owns the bridge object, not native.** `pitaka-bridge`'s client defines
`window.__PITAKA_BRIDGE__` — `_receive`, the pending-request map, the per-call timers,
the typed method wrappers, the event emitter — as part of the SPA bundle. Native only
delivers JSON into it. This matters because a native-injected object carrying live
functions cannot reliably pre-exist the page's own scripts across both platforms, so
"native injects the bridge before content loads" would be a design that works on one OS
and races on the other. Native's only injection responsibility is
`window.ReactNativeWebView.postMessage`, which `react-native-webview` provides as a
side effect of setting the `onMessage` prop.

```ts
type ErrorCode =
  | 'METHOD_NOT_FOUND' | 'INVALID_PARAMS'   | 'UNAUTHORIZED'
  | 'USER_CANCELLED'   | 'TIMEOUT'          | 'VERSION_MISMATCH'
  | 'BRIDGE_UNAVAILABLE' | 'INTERNAL'
```

### Timeouts — the headline departure

Every call is timeout-bounded. Non-interactive methods default to 10 s; interactive
ones (`payments.requestPayment`, `ui.confirm`) get 120 s because a human is in the
loop. On expiry the promise rejects with `TIMEOUT` and the pending entry is evicted.

**Timeouts are client-side only and do not cancel native work.** A `TIMEOUT` means "the
H5 stopped waiting", not "nothing happened" — on an interactive money call native may
still be showing a confirmation sheet the user goes on to approve. Two things make that
safe rather than merely acknowledged: the `idempotencyKey` the H5 already sends means a
retry cannot double-charge, and a late response for an evicted `id` is dropped silently
rather than resolving a stale promise.

The recovery path is therefore concrete and needs no new endpoint: after `TIMEOUT` on a
payment the H5 shows an indeterminate "checking your payment" state and **re-calls
`payments.requestPayment` with the identical `idempotencyKey`**. If the first attempt did
complete, idempotency returns the original receipt and the H5 renders success; if it did
not, the payment proceeds normally. What the H5 must never do is show a failure or offer a
fresh payment with a new key — that is precisely how a user ends up paying twice. This is
stated because it is the sharp edge that remains once the hang is fixed, and it is the
reason the idempotency key is generated by the H5 before the first attempt rather than by
native per call.

**The host owns the ceiling on any native UI it renders for the H5.** `ui.showLoading`
without a matching `ui.hideLoading` — an H5 that crashes or navigates mid-flight — would
otherwise leave a native overlay covering the app with no way out. The host dismisses
its loading overlay after 30 s regardless, and on WebView reload or unmount. An H5 can
never wedge the shell.

*[ref: the reference implementation had **zero** timeout handling — a native handler
that never invoked its callback left the promise pending forever, stranding the
loading skeleton permanently. Timeouts existed only at HTTP layers. This is the single
largest robustness gap in that contract and the first thing this design fixes.]*

### Methods (v1)

| Method | Params | Result |
|---|---|---|
| `system.getEnvInfo` | — | `{ platform, osVersion, appVersion, containerVersion, bridgeVersion, deviceId }` |
| `system.getStartupParams` | — | `{ source, entryTileKey?, deepLinkParams? }` |
| `auth.getSession` | — | `{ userId, maskedMobile, sessionId }` |
| `auth.signRequest` | `{ method, path, body? }` | `{ signature, timestamp, nonce, keyId }` |
| `user.getProfile` | — | `{ userId, displayName, maskedMobile, avatarUrl? }` |
| `config.getFlags` | `{ keys: string[] }` | `Record<string, string>` |
| `ui.setTitle` | `{ title }` | `void` |
| `ui.toast` | `{ message, variant? }` | `void` |
| `ui.showLoading` / `ui.hideLoading` | `{ message? }` / — | `void` |
| `ui.confirm` | `{ title, message, okText?, cancelText? }` | `{ confirmed: boolean }` |
| `nav.push` | `{ appId, params? }` | `void` |
| `nav.close` | — | `void` |
| `nav.setBackIntercept` | `{ enabled: boolean }` | `void` |
| `payments.requestPayment` | `{ amountCentavos, billerId, reference, idempotencyKey }` | `{ transactionId, status, receiptUrl? }` |

`auth.getSession` returns a `sessionId`, never a bearer token — H5 cannot replay
credentials elsewhere. `config.getFlags` exists because **native is the only Firebase
client**; one source of flag truth. `nav.push` takes a registry `appId`, not a URL
*[ref: navigation between mini-apps was by registry id]*.

`auth.signRequest` takes the **body itself, not a hash of it**, and native hashes what it
signs. Letting the H5 supply `bodyHash` would have made native a blind signing oracle
that attests to bytes it never saw. Native also validates `(method, path)` against a
compile-time allowlist of the routes an H5 is permitted to reach and rejects anything
else with `UNAUTHORIZED`, so a compromised H5 cannot get a valid signature for, say,
`POST /transfers`. Bill payment goes through `payments.requestPayment`, which native
performs itself — H5 never signs a money-moving request at all.

`nav.setBackIntercept` exists because Android's `hardwareBackPress` handler must return a
boolean synchronously, so the host cannot await an H5's answer at press time. The H5
declares up front whether it wants the back press; while intercept is enabled the host
forwards an `onBack` event instead of popping, and the H5 must call `nav.close` itself.
The host clears intercept on navigation and applies a 250 ms grace window: if the H5 does
not act, the host pops anyway rather than trapping the user.

### Events (native → H5)

`onResume`, `onPause`, `onBack`, `onNetworkChange`. The H5 client exposes
`bridge.on(event, handler)`.

*[ref: the reference bridge was strictly request/response with no event channel at
all; "resume" was emulated by listening to `visibilitychange` and doing a full
`window.location.reload()`. An explicit event channel is a deliberate improvement, and
`onBack` in particular lets an H5 with unsaved state intercept the hardware back
button instead of losing it.]*

### Handshake and versioning

The H5 client installs `window.__PITAKA_BRIDGE__` on module load, then probes for a host
by sending `system.getEnvInfo` and waiting a bounded 3 s. Success means "running in a
container"; timeout means "plain browser" and the client rejects `BRIDGE_UNAVAILABLE` —
fast and legible instead of hanging. The client declares a required major version, and a
host that cannot satisfy it answers `VERSION_MISMATCH`. Because readiness is *detected*
rather than assumed from an injection that may or may not have landed, there is no
platform-dependent race.

### Lifecycle: when the document goes away

A WebView can navigate or unmount with native calls still in flight, and stale replies
must not resolve fresh promises. Native keeps a monotonic `loadId`, incremented on each
`onLoadStart`, and stamps every pending request with the `loadId` current when it
arrived. Three rules follow: a response whose `loadId` no longer matches is dropped
rather than delivered; on navigation or unmount every pending native handler for the
previous generation is abandoned and its result discarded; and the H5 client rejects all
of its own outstanding promises with `BRIDGE_UNAVAILABLE` on `pagehide`, so an
in-progress `await` cannot silently outlive its document.

### Browser mock and the contract suite

`pitaka-bridge` ships a browser mock with the same typed surface, backed by
in-browser fixtures, so H5 development needs no simulator. The mock and the native
handler registry both run **the same contract test suite** — every method's params and
result shape, every error path, timeout behaviour, and event delivery. The mock cannot
drift from the host without turning CI red.

*[ref: the reference used a build-time module alias swapping a real SDK bridge for a
fake that proxied to a recorded-fixture server. Same idea, better guarantee: the fake
there had no shared test suite holding it to the real contract, and typecheck and
runtime deliberately resolved to different modules.]*

## Remote Config

Native owns the Firebase SDK (`@react-native-firebase/remote-config` via an Expo
config plugin, on the existing `fintech-clone` Firebase project). Fetch-and-activate on
launch; bundled defaults cover first run and offline. H5 reads flags only through
`config.getFlags`.

**The fetch interval has to be set explicitly or the demo does not work.** Remote
Config's `minimumFetchIntervalMillis` defaults to twelve hours, so a console edit would
not appear on the next launch and the "live, no redeploy" claim would be false as
observed. Debug and demo builds set the interval to `0`; release builds use one hour. The
app also refreshes on foreground and offers pull-to-refresh on the View All screen, so
there is always a deliberate way to pull a change through without waiting or reinstalling.
Firebase's own guidance warns against a low interval in production, which is exactly why
this is build-dependent rather than a single constant.

### Parameters

| Key | Type | Purpose |
|---|---|---|
| `services_grid` | JSON string | The categorised tile grid |
| `h5_base_url` | string | Base URL for all H5 microfrontends |
| `greylisting_bills` | JSON string | `{"enabled":bool}` |
| `greylisting_rewards` | JSON string | as above |
| `bridge_debug_overlay` | JSON string | `{"enabled":bool}` — shows the request-log strip |

Flag values are **stringified JSON objects**, matching the reference's wire format
(`greylisting_<feature>` for rollout gating, `<feature>_<setting>` for tunables).

### `services_grid` shape

```json
{
  "version": 1,
  "categories": [
    {
      "key": "manage",
      "label": "Manage",
      "tiles": [
        {
          "key": "bills",
          "label": "Bills",
          "icon": "receipt",
          "type": "h5",
          "target": "bills",
          "enabled": true,
          "badge": "NEW"
        }
      ]
    }
  ]
}
```

`type` is `native | h5`. For `native`, `target` is a route name; for `h5`, `target` is a
registry key resolved to `${h5_base_url}/h5/${target}/`. The registry key is validated
against `^[a-z][a-z0-9-]*$` before interpolation, so a config value cannot traverse
paths or inject a query string. There is deliberately no `external` type: ADR 13 commits
to navigation by registry id, and an arbitrary-URL escape hatch would undo both that and
the origin allowlist.

### Parsing and the resolver

Every config value is parsed with a **zod schema via `safeParse`**. On any failure —
malformed JSON, unknown `type`, missing key, `version` newer than the client
understands — the app logs and falls back to bundled defaults. It never throws into a
render path.

*[ref: the reference called bare `JSON.parse` on flag values inside `onMount`; one
malformed flag would throw and strand the loading skeleton permanently. Its TypeScript
interface also typed these flags as `number` when the wire format was a JSON string —
a type that was never enforced because the bridge returned `Record<string,string>`.]*

`resolveTile(tile, flags) → NavIntent | null` is a **pure function**: config in,
navigation decision out. It is the most heavily tested unit in the codebase and the
piece a reviewer should read first.

### Fixture matrix

The config fixtures double as the test matrix and as teaching material, one file per
rollout state: all enabled, bills disabled, rewards disabled, both disabled, malformed
JSON, missing keys, unknown tile `type`, future `version`, empty grid. Each asserts
the degraded behaviour is graceful.

*[ref: the reference repo's mock store contained exactly this kind of per-state fixture
set, including scenes that omitted keys entirely and one that returned an empty object
— the best artifact in it.]*

## Mock API (BFF)

Express + TypeScript in `pitaka-app/services/mock-api`. In-memory store, seeded on
boot, reset on restart. Fake money — modelled properly.

### Domain rules

- **Integer centavos everywhere.** No floating-point value ever represents money.
  Formatting to `1,234.56` happens only at the display edge.
- **Append-only ledger.** `ledger_entries(id, account_id, tx_id, amount_centavos,
  created_at)`; a balance is `SUM(amount_centavos)` over an account, never a mutable
  column. **Every** money movement writes entries summing to zero across accounts, not
  just transfers: a bill payment debits the user and credits a per-biller liability
  account, and a Cash In credits the user and debits a `funding:external` account that is
  expected to go negative. Seeded accounts therefore include one per biller and the
  funding account. An invariant test asserts the sum of every entry in the ledger is
  exactly zero after any endpoint sequence — the single assertion that catches a
  half-written transaction.
- **Idempotency keys on every money mutation.** `POST /transfers` and
  `POST /bills/payments` require an `Idempotency-Key` header. Replaying a key returns
  the original stored response; reusing a key with a different request body is a
  `409`. A retry can never double-spend.
- **Negative balances are rejected** at write time, and an invariant test asserts no
  account can reach one through any endpoint sequence.

### Endpoints

`POST /auth/login` · `GET /wallet/balance` · `GET /wallet/transactions` ·
`POST /transfers` · `GET /billers` · `POST /bills/payments` · `GET /health`

### Identity

The signature proves transport integrity, not identity — a shared demo key attests only
that the caller holds the key, never *which* user is calling. Identity is separate and
explicit: `POST /auth/login` (mobile + MPIN) returns an opaque `sessionId` with a
30-minute sliding TTL. The native host keeps it in `expo-secure-store` and sends it as
`X-Session-Id` on every authenticated request; the H5 never holds it and never sends it
directly, because H5 requests are the ones native signs on its behalf. The BFF resolves
`X-Session-Id` to an `account_id` server-side and **derives the acting account from the
session alone** — never from a field in the request body — so no caller can move another
user's money by editing a payload. An unknown or expired session is `401` with
`SESSION_EXPIRED`, which the host handles by returning the user to Login.

### Request signing

The host signs; the BFF verifies. The H5 hands native the request body and native hashes
what it signs (see `auth.signRequest` above). The signed string is:

```
${method}\n${path}\n${timestamp}\n${nonce}\n${sha256(body)}
```

HMAC-SHA256 with a demo key held in `expo-secure-store` on the device and in the BFF's
environment. The key is provisioned at first launch: the host generates one, stores it,
and registers it with the BFF under its `keyId` during `POST /auth/login` — so a fresh
install works with no manual step and the `keyId` field earns its place.

The BFF answers with a documented error envelope, `{ code, message }`, using codes that
mirror the bridge's `ErrorCode` union so the two layers read the same way:
`INVALID_SIGNATURE` (401), `CLOCK_SKEW` (401), `NONCE_REPLAYED` (401 — an authentication
failure, not a conflict), `SESSION_EXPIRED` (401), `IDEMPOTENCY_KEY_REUSED` (409, body
differs from the stored request), and `INSUFFICIENT_FUNDS` (422). Bare status codes are
not the contract; two different failures never share one code.

**Nonce and idempotency must not fight each other.** A legitimate retry of
`POST /transfers` reuses the `Idempotency-Key` but is a *new signature with a new nonce* —
so replay protection sees a first-time nonce and idempotency sees a known key, which is
exactly right and returns the stored response. The rule is that the nonce protects the
*signature* and the idempotency key protects the *operation*; a retry must never reuse the
nonce, and the H5 client enforces that by signing afresh on every attempt. This is the
one interaction where getting the layering backwards would make retries impossible.

Nonces live in a bounded in-memory store, keyed with their timestamp and evicted past the
5-minute skew window, so the set cannot grow without limit. A BFF restart clears both the
nonce set and the idempotency store, which means a retry spanning a restart could in
principle re-execute — acknowledged and accepted for a single-instance demo, and called
out in the ADR as the precise thing a durable store buys you in production.

Two things are explicit in the ADR: the key never reaches the web layer, and
symmetric HMAC with a shared demo secret is a **teaching simplification** — a real
wallet uses asymmetric signing with a device-bound key in the platform keystore.

*[ref: signing was delegated to native via a `getSignedBody` bridge call and the
private key never touched the web layer — a good pattern, adopted. But that BFF
**never verified** the signature; it base64-decoded the middle segment to harvest
correlation ids and relayed the blob upstream, leaving the far backend as sole
verifier. Verifying at our BFF is a deliberate improvement, and the seam where it was
missing is itself the lesson.]*

### SSRF guard

Any URL that arrives from Remote Config — `h5_base_url` above all — is validated against
a **compile-time allowlist of exact origins** (scheme, host, and port; `https:` only)
before a WebView loads it. The comparison is against `new URL(value).origin`, never a
hostname suffix match — `fintech.ctaprojects.xyz.attacker.com` must not pass a check for
`ctaprojects.xyz`, and suffix matching is the classic way that check gets written wrong.
An unrecognised origin falls back to the bundled default rather than being honoured.

The allowlist is enforced in two places, because one is not enough: at config-parse time,
and again in `onShouldStartLoadWithRequest` on every navigation the WebView attempts — so
a redirect or an in-page `location` change cannot escape the origin the page started on.

*[ref: the reference mapped a config-supplied base URL through a hardcoded allowlist with
environment-default fallback — the single best security pattern I saw there, and worth
noting that its version compared full origins, which is stricter than the host-level check
this spec originally described.]*

## UI and design

The visual language is a two-tone blue e-wallet aesthetic: a balance card, an icon
grid, categorised sections. Shared tokens (colour, spacing, type scale, elevation,
z-index) live in `pitaka-app/packages/ui-tokens` and are consumed by both the native
app and the H5 SPAs, so the WebView pages look continuous with the shell. The H5 repos
get them the same way they get the bridge — a pinned git dependency
(`github:christiantroyandrada/pitaka-app#tokens-v1.0.0`, a tag scoped to the tokens
package) — so a palette change is a deliberate, reviewable bump in each repo rather than
an invisible drift. Tokens are published as CSS custom properties for the H5 side and a
plain TS object for React Native, generated from one source file.

Behaviours worth porting deliberately, each carrying a fix:

- **MPIN entry** is a real, invisible `<input type="number">` (H5) or `TextInput` (RN)
  layered over decorative dots — not a synthetic keypad — so native keyboards, paste,
  and IME behave. *[ref: same mechanism; its version ignored `maxlength` on
  `type=number` (so digit limits were silently unenforced) and its `<label for>`
  pointed at an id no element carried. We enforce length in the change handler and
  associate the label properly.]*
- **Mobile number input** shows a fixed `+63` prefix and strips a leading `0`, because
  Filipino users habitually type `09XX…`. *[ref: same, and easy to miss.]*
- **Reserved helper row** under every field, so showing an error never shifts layout;
  typing clears the error.
- **Layout-matching skeleton screens** during the config handshake, so content does not
  visibly restructure when it mounts.
- **Imperative toast / alert / confirm** callable from the service layer, not just from
  components — these are the H5-side fallbacks behind `ui.toast` and `ui.confirm`. Built
  as React portals with real `<button>` elements and instance-scoped state. *[ref: its
  versions were raw-DOM with `innerHTML` interpolation (an XSS path if content ever
  carried server data), fixed element ids that cross-wired two concurrent dialogs, and
  `<a role=button>` with no keyboard activation.]*
- **Bridge debug overlay** — a bottom-docked strip listing in-flight and completed
  bridge calls, gated by the `bridge_debug_overlay` flag. Inside a WebView there are no
  devtools; this is the substitute. *[ref: its `Reqlog`, worth keeping verbatim.]*
- **Confirm dialogs** put Cancel left, OK right, and style them differently — a
  destructive/secondary distinction. *[ref: its confirm rendered both buttons as
  identical blue pills differing only in font weight.]*

Accessibility is in scope at a basic level: labelled inputs, an `aria-label` conveying
MPIN progress (the dots are decorative), focus trap and Escape handling on modals,
contrast-checked tokens, and reduced-motion respect. Overlay click does **not** dismiss
a payment modal — deliberate for money flows.

## Testing

Test-driven throughout, per `superpowers:test-driven-development`. Red, green, refactor,
per behaviour.

| Layer | Tooling | Coverage focus |
|---|---|---|
| Bridge contract | vitest | Shared suite run against **both** the native registry and the browser mock: every method, error codes, timeout expiry, event delivery, version negotiation, handshake failure |
| Grid resolver | vitest | Pure-function matrix over the config fixtures, including every degraded case |
| Mock API | vitest + supertest | Idempotency (replay, key reuse with different body, concurrent, retry-with-new-nonce), ledger invariants (every entry sums to zero, no negative user balance reachable), HMAC (valid, tampered, stale, replayed nonce), identity (session resolves the acting account; a body claiming another account cannot move its money) |
| Origin allowlist | vitest | The security property the spec is proudest of, so it gets its own row: exact-origin match accepts the real origin and rejects suffix impostors (`…ctaprojects.xyz.attacker.com`), scheme downgrades, and port mismatches; registry keys failing the pattern are refused before interpolation |
| H5 components | vitest + RTL | Bills flow against the browser mock, including bridge-rejection paths |
| Native components | jest-expo + RTL Native | Login, grid rendering from config, Send Money |
| E2E | Maestro | Phase 3: login → grid → open H5 bill → native confirm → balance updated |

Two rules: no test asserts on a floating-point money value, and every bridge method
gets an explicit failure-path test (rejection, cancellation, timeout) — not only a
happy path.

Maestro reaches WebView content through OS accessibility APIs, which do not always expose
web elements reliably, so the E2E flow is written against stable `data-testid` attributes
on every H5 control it touches. Those attributes are part of the H5's contract and are
added in P2 when the Bills page is built, not retrofitted in P3 when the flow is written —
otherwise the e2e phase begins with a scavenger hunt. On Android the flow sets
`androidWebViewHierarchy: devtools` if the default hierarchy proves insufficient. If the
WebView leg turns out to be flaky for platform reasons rather than product ones, the
fallback is a native-only Maestro flow plus H5 coverage in RTL — stated now so it is a
planned degradation rather than a P3 surprise.

## Deployment

`fintech.ctaprojects.xyz` on the existing VPS (`side-vps`), behind the nginx patterns
already hardened for chat-app: `default_server` returning 444 on unknown Host,
security headers re-declared inside every `location` that sets any header (the
`add_header` inheritance trap), dotfile denial, OCSP stapling, rate limiting, and
`proxy_hide_header` on upstream technology headers.

| Path | Serves |
|---|---|
| `/` | Static landing page: what this is, architecture diagram, links to all four repos |
| `/h5/bills/` | `pitaka-h5-bills` build output |
| `/h5/rewards/` | `pitaka-h5-rewards` build output |
| `/api/` | mock API container, bound to `127.0.0.1`, proxied |

Each H5 repo's CI deploys only its own path on merge to main — a Bills fix ships
without touching the app or Rewards. That independence is the microfrontend claim, made
literal.

Prerequisites: a DNS A record for `fintech` (one-click in Cloudflare, user action) and a
certbot certificate expansion. The mock API runs as one small container; H5 output is
static files.

CSP is delivered in both enforce and report-only modes, with violations posted to a
`/api/cspreport` sink. *[ref: the reference ran exactly this dual-channel setup.]*

Observability stays deliberately simple: `/health`, a `/metrics` endpoint on the mock
API, and structured JSON logs. *[ref: the reference had Micrometer-named Prometheus
metrics, log4js→Kafka→OpenSearch shipping with OpenTelemetry trace correlation, and k8s
probes served outside the framework so they survived an app-layer wedge. That last idea
is worth borrowing; the pipeline is out of scope and would be noise in a demo.]*

## Build phases

**P1 — walking skeleton.** Four repos created and wired. Bridge v0.1 with
`system.getEnvInfo` and `ui.toast`, timeout handling, and the contract suite green
against both implementations. Native login and home with a hardcoded grid.
`pitaka-h5-bills` reduced to a page that performs one real bridge round trip inside
the WebView. Done when a tap in the shell opens an H5 page that calls native and gets
an answer.

**P2 — core.** Remote Config drives the grid, with the zod layer and full fixture
matrix. Mock API with ledger, idempotency, and HMAC verification. Send Money end to
end. The complete Bills flow with the native payment sheet. Done when flipping a flag
in the Firebase console changes what a tile opens, and a bill payment moves the
balance through a verified signed request.

**P3 — ship.** Rewards H5 (proving independent deploys), VPS deployment, design polish
pass, accessibility pass, Maestro e2e, README with diagrams and demo GIFs, all ADRs
finalised.

### Working split

Agent builds rails: repo scaffolds, CI, test harnesses, typed interfaces, and failing
tests. The author makes them green — the React and React Native feature code is
hand-written, which is the point. Adversarial review follows each phase (multi-critic
for the bridge, signing, and ledger; standard review elsewhere).

ADRs are drafted in conversation and **finalised in the author's own words**. The rule
from the working agreement applies: if the PR cannot be explained in plain language
without reading the diff, it is not ready.

## Architecture decision records

Thirteen ADRs live in `pitaka-app/docs/adr/`. They are written last, once the decision has
survived implementation — an ADR defending a choice never built is fiction.

1. Multi-repo, one per SPA — why not a monorepo
2. Typed, timeout-bounded bridge with an event channel — why a callback-only contract can
   hang forever, and why the timeout is client-side only
3. The H5 owns the bridge object; native only delivers into it — why "inject before content
   loads" is a race, not a design
4. Native owns Firebase; H5 receives flags through the bridge — one source of flag truth
5. Native signs requests and hashes what it signs; H5 never holds keys — why accepting a
   caller-supplied hash makes the signer a blind oracle
6. The BFF verifies signatures — why "the upstream verifies" is not enough
7. Session identity is separate from transport integrity — why a signature does not say
   *who*, and why the acting account comes from the session and never the body
8. Config-supplied URLs are origin-allowlisted, enforced twice — SSRF at the WebView
   boundary, and why suffix matching is the wrong check
9. Integer centavos and an append-only ledger that sums to zero — why a mutable balance
   column is a bug
10. Idempotency keys on every money mutation — and why the nonce protects the signature
    while the key protects the operation
11. Native owns the payment confirmation UX
12. UI components never import the bridge — lint-enforced layering
13. Config-driven navigation by registry id, not URL — and why there is no `external` escape
    hatch

## Risks

**Scope.** Four repos and thirteen ADRs is a lot for a learning project. Mitigation: P1
is a genuine walking skeleton, and Rewards — the least essential surface — is last, so
the project is demo-ready before it is complete. If effort runs long, Rewards is the
designed cut: dropping it costs one talking point about independent deploys and nothing
else, and the spec is written so that decision can be taken in P3 without rework.

**Firebase native module friction.** `@react-native-firebase` requires a dev client and
`expo prebuild`, which is more setup than Expo Go. Accepted deliberately: it is the
authentic path, and the alternative (a JS-only flag shim) would misrepresent the
architecture. Bundled defaults mean the app runs before Firebase is wired.

**Cross-repo drift.** Real, and the point. Pinned git dependencies plus the shared
contract suite make it visible in CI rather than at runtime.

**Learning goal erosion.** The failure mode is the agent writing the feature code. The
split above is the guard: rails and failing tests from the agent, implementations by
hand.

## Appendix A — departures from the reference

Each is an ADR and a talking point: "a system of this shape commonly does X; this does
Y, because Z." These are failure *classes* endemic to WebView/bridge architectures under
delivery pressure — none is unique to any one codebase, and each is described here as a
pattern to design against rather than an incident to attribute.

| Reference behaviour | This design | Why |
|---|---|---|
| No timeout on bridge calls; a silent native failure hangs the H5 forever | Per-call timeouts, typed `TIMEOUT` error | Largest robustness gap in the original |
| No native→H5 events; resume emulated via `visibilitychange` + full page reload | Explicit event channel (`onResume`, `onBack`, …) | Reload loses state and is user-visible |
| Untyped `call(...args: unknown[])` | Per-method typed signatures | Compile-time safety across the boundary |
| Bare `JSON.parse` on flag values in a render path | zod `safeParse` with bundled-default fallback | One malformed flag bricked the page |
| Flag types declared `number`, wire format a JSON string | Schema matches the wire format | An unenforced type is worse than none |
| BFF relays the signed blob without verifying | BFF verifies HMAC, timestamp, nonce | Defence in depth at the boundary you own |
| Mock bridge with no shared contract tests | Mock and host share one suite | Prevents mock drift |
| `innerHTML` dialogs, fixed element ids, no keyboard activation | Portals, real buttons, scoped state | XSS path and broken a11y |
| Animation CSS and scroll-lock imported by nothing — dead in the shipped build | Ship the styles and assert delivery in a test | Archetypal silent migration regression |
| Two styling systems, one unused (Tailwind loaded, tokens used) | One token system | Dead weight on every page |
| Secrets module logging the entire environment | Never; called out in the ADR | Leaks private keys to logs |
| Static module-level AES key and IV reused process-wide | No client-side crypto at all; native signs, per-request nonce | Reuse defeats the cipher — and a web layer that needs none should hold no key material |
| `X-Content-Type-Options: max-age=…` | `nosniff` | Copy-paste error, silently no-op |
| Environment check missing a `return`, so production shipped analytics to the non-prod project | Tested environment resolution | A one-line bug with production impact |

None of these are criticisms of anyone who shipped under deadline — most are decisions I
would likely have made myself with the same constraints, and several I only understood
by maintaining the result. They are here because the gap between what a system was
designed to do and what it actually does is where the engineering lessons live, and
designing explicitly against a known failure class is more honest than pretending a
clean-room design would have avoided it.
