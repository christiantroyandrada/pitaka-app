# ADR 4: Native owns Firebase; H5 receives flags through the bridge

**Status:** Accepted
**Date:** 2026-07-30

## Context

Flags drive routing here, not cosmetics. `resolveTile(tile, flags, h5BaseUrl)` in `src/config/resolveTile.ts` decides whether a tile opens a native route, an H5 URL, or nothing, and `parseServicesGrid` builds the entire grid from a remote JSON string. When the H5 microfrontends land they need the same flags: `greylisting_<key>`, `h5_base_url`, per-feature gates.

Each H5 could embed the Firebase JS SDK and fetch its own config. That means two clients, two fetch intervals, two caches, and a host and an H5 page that can disagree about whether a feature is on. The visible failure is a tile that navigates to a page which then hides itself.

## Decision

The host is the only Firebase client. H5 pages read flags through one bridge method, `config.getFlags({ keys })`, returning `Record<string, string>`, the same `Flags` type `resolveTile` already consumes. Values stay stringified JSON and are parsed at the boundary with zod, never a bare `JSON.parse` on a mount path.

## Consequences

One fetch schedule, one activation moment, one source of flag truth. H5 bundles carry no Firebase SDK, and a flag rollout needs no H5 redeploy; the microfrontends ship no flag defaults at all.

Cost: an H5 page cannot read a flag without a working host. Browser-only H5 development therefore needs the `pitaka-bridge` mock to serve flag fixtures, which puts the mock on the contract-test surface. Flags are also async in H5 where they are sync in the host, so every H5 gate needs a defined pre-resolution state.

## When this would change

- An H5 needs a flag before the handshake resolves and the pre-resolution state reads as broken: the host injects a flag snapshot at WebView load. Still no second SDK.
- `config.getFlags` p95 exceeds 100 ms on a mid-range Android device: same fix.
- An H5 needs Firebase A/B Testing or Analytics-based targeting the host cannot proxy, because assignment has to happen per web page. That H5 gets its own client and this ADR is superseded.

*Draft — revise in my own words before treating this as final.*
