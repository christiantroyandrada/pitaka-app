# ADR 8: Config-supplied URLs are origin-allowlisted, enforced twice

**Status:** Accepted
**Date:** 2026-07-30

## Context

The services grid arrives from remote config. `resolveTile` (`src/config/resolveTile.ts`) joins a config-supplied base URL with a tile's `target` and returns it for whatever string it was handed. A WebView that loads that URL inherits the bridge, and with it the wallet's signing capability, so a config value has the same reach as shipped code.

This check is usually written as a hostname suffix match, which accepts `pitaka.ph.attacker.com` and ignores scheme and port. The production system I worked in did map a config base URL through a hardcoded allowlist, which was the right shape, but compared hosts rather than origins.

## Decision

A compile-time array of exact origin strings: scheme, host, port, `https:` only. A value is accepted only when `new URL(v).origin` is strictly equal to a member. No suffix match, no hostname regex, no wildcards. Anything unparseable or unrecognised falls back to `DEFAULT_GRID` in `src/config/defaults.ts`, the same failure mode `parseServicesGrid` already uses.

Enforced in two places: at parse time alongside the zod schemas in `src/config/schema.ts`, and again in the WebView's `onShouldStartLoadWithRequest`, so a redirect or an in-page `location` assignment cannot leave the origin the page started on. Tile keys stay bounded by `registryKey` (`/^[a-z][a-z0-9-]*$/`) before interpolation, so `target` cannot traverse the path or open a query string.

## Consequences

Remote config can no longer aim the app at an arbitrary host, and a mistake in the parse-time check is no longer fatal.

The cost is that adding an H5 origin needs an app release. That removes the "flip a config value" path for staging and per-branch preview URLs, and `__DEV__` builds need their own entry, which is a divergence I have to keep tested.

## When this would change

- Third-party partner H5s land and origins outgrow a hardcoded list. The replacement is a natively verified signed manifest, not a looser match.
- `onShouldStartLoadWithRequest` is shown not to fire for some navigation class (iframe, `window.open`, worker fetch). Then the BFF adds CSP `frame-src`/`connect-src` as a third layer.
- Preview URLs become routine in QA. Then a `__DEV__`-only list is added, with a test asserting the release list contains no `http:` or localhost origin.

*Draft — revise in my own words before treating this as final.*
