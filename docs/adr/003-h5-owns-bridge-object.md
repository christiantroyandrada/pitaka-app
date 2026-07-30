# ADR 3: The H5 owns the bridge object; native only delivers into it

**Status:** Accepted
**Date:** 2026-07-30

## Context

The planned WebView container needs `window.__PITAKA_BRIDGE__` to exist before an H5's first call. The obvious placement is native: inject the object with `injectedJavaScriptBeforeContentLoaded` and let pages assume it. iOS and Android schedule pre-content injection differently, and an object carrying live functions — pending map, per-call timers, event emitter — cannot be reliably installed ahead of the page's own scripts on both. Such a design works on one OS and races on the other.

## Decision

`pitaka-bridge`'s H5 client defines `window.__PITAKA_BRIDGE__` on module load, inside the SPA bundle. Native's only injection responsibility is `window.ReactNativeWebView.postMessage`, which `react-native-webview` provides as a side effect of the `onMessage` prop. Downward traffic is `injectJavaScript` calling `_receive(json)`.

Readiness is detected, not assumed: the client probes `system.getEnvInfo` with a bounded 3 s wait. A reply means container; a timeout means plain browser, and calls reject `BRIDGE_UNAVAILABLE`. Same fail-closed instinct as `parseServicesGrid` and `resolveTile`.

## Consequences

The client is pinned into each H5 bundle (`pitaka-bridge#vX.Y.Z`), so a client-side fix means every H5 bumps and redeploys. Native cannot hot-patch the web half. Every load pays the probe.

In exchange: no injection race, timers and the pending map exist before any call is possible, and the same object runs against the browser mock, so the contract suite covers one code path.

## When this would change

- `react-native-webview` documents pre-content injection ordering as guaranteed on both platforms and a contract test proves it. Native ownership would then buy central versioning.
- The 3 s probe shows as blocked first paint in a real trace: keep ownership, drop the blocking wait, resolve readiness lazily on the first call.
- A deployed H5 needs a bridge fix and cannot be redeployed. That is the cost this ADR accepts; one occurrence is enough to revisit.

*Draft — revise in my own words before treating this as final.*
