# ADR 8: Config-supplied URLs are origin-allowlisted, enforced twice

**Status:** Accepted
**Date:** 2026-07-30

## Context

The services grid arrives from remote config. `resolveTile` (`src/config/resolveTile.ts`) joins a config-supplied base URL with a tile's `target` and returns it for whatever string it was handed. A WebView that loads that URL inherits the bridge, and with it the wallet's signing capability, so a config value has the same reach as shipped code.

This check is usually written loosely. A `startsWith` or `includes` test accepts `pitaka.ph.attacker.com`; a suffix match accepts `evil-pitaka.ph`. Both ignore scheme and port. The production system I worked in did map a config base URL through a hardcoded allowlist, which was the right shape, but compared hosts rather than origins.

## Decision

A compile-time array of exact origin strings: scheme, host, port, `https:` only. A value is accepted only when `new URL(v).origin` is strictly equal to a member. No suffix match, no hostname regex, no wildcards. Anything unparseable or unrecognised falls back to the compiled-in default base URL, mirroring the way `parseServicesGrid` falls back to `DEFAULT_GRID`.

Enforced in two places. First at the flag boundary, where the `h5_base_url` value is read. Grid tiles never carry a URL, so this is the only config-supplied origin in the system. Then again in the WebView's `onShouldStartLoadWithRequest`, so a redirect or an in-page `location` assignment can't leave the origin the page started on. Separately, a tile's `target` is bounded by `registryKey` (`/^[a-z][a-z0-9-]*$/`) in `src/config/schema.ts` before it is interpolated into the path, so it can't traverse or open a query string. A tile's `key` is deliberately *not* bounded that way, see ADR 13 for what that costs.

## Consequences

Remote config can no longer aim the app at an arbitrary host, and a mistake in the parse-time check is no longer fatal.

The cost is that adding an H5 origin needs an app release. That removes the "flip a config value" path for staging and per-branch preview URLs, and `__DEV__` builds need their own entry, which is a divergence I have to keep tested.

## When this would change

- Third-party partner H5s land and origins outgrow a hardcoded list. The replacement is a natively verified signed manifest, not a looser match.
- `onShouldStartLoadWithRequest` is shown not to fire for some navigation class (iframe, `window.open`, worker fetch). Then the BFF adds CSP `frame-src`/`connect-src` as a third layer.
- Preview URLs become routine in QA. Then a `__DEV__`-only list is added, with a test asserting the release list contains no `http:` or localhost origin.

*Draft. Revise in my own words before treating this as final.*
