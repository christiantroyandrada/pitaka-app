# ADR 13: Config-driven navigation by registry id, with flags failing closed

**Status:** Accepted
**Date:** 2026-07-30

## Context

The home grid is remote-configured, so config decides what the user can reach. If a tile could carry a URL, config would decide where the app navigates, and any later origin allowlist becomes decoration. A production system I worked in routed between mini-apps by registry id for exactly this reason. The same system called bare `JSON.parse` on flag values inside a mount path; one malformed flag left a loading skeleton on screen permanently.

## Decision

A tile declares `type: 'native' | 'h5'` and a `target` that is a registry key, never a URL. `registryKey` in `src/config/schema.ts` is `/^[a-z][a-z0-9-]*$/`, so a config value cannot traverse paths or open a query string once it is interpolated. `resolveTile(tile, flags, h5BaseUrl)` in `src/config/resolveTile.ts` maps `h5` targets to `${base}/h5/${target}/` and `native` targets to a route. There is deliberately no `external` tile type.

Flags fail closed. `greylisting_<tileKey>` values are stringified JSON; an unparseable or wrong-shaped value hides the tile. A parse error should never be why a gated feature ships. Grid config goes through `parseServicesGrid` (`src/config/parseConfig.ts`) with `safeParse` and falls back to `DEFAULT_GRID`.

## Consequences

Navigation targets are a bounded vocabulary, testable without a device, and enumerable in review. The cost is that shipping a new H5 destination needs an app release to add the route or key, not just a config push.

Sharp edge: an absent flag means allowed. `greylisting_billsPay` instead of `greylisting_bills-pay` silently ships the feature. Key naming needs a lint or a test, not care.

## When this would change

If we need to launch a partner destination not in the registry, add a second allowlisted origin plus its own tile type rather than an `external` escape hatch. If unmatched flags start gating revenue-relevant features, invert the default to deny and require an explicit allow entry per tile.

*Draft — revise in my own words before treating this as final.*
