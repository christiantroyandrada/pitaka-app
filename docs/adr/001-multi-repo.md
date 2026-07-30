# ADR 1: One repo per H5 microfrontend

**Status:** Accepted
**Date:** 2026-07-30

## Context

Pitaka is planned as four repos: `pitaka-app` (Expo host, bridge host, mock API), `pitaka-bridge` (envelope types and client), and `pitaka-h5-bills` / `pitaka-h5-rewards` (Vite + React SPAs). A monorepo is the default choice and would make a bridge contract change one atomic commit.

Super-app teams do not ship that way. Each mini-app has its own owners and cadence; the host ships on store timelines, H5 pages ship whenever. A layout where an H5 change lands only alongside a host change models the wrong organisation.

The host already treats H5 apps as URLs, not modules. `resolveTile` in `src/config/resolveTile.ts` returns `{ kind: 'h5', url }`, built from a config-supplied base URL and the tile's `target` registry key. Nothing there needs the SPA to build in the same tree.

## Decision

One repo per H5 SPA. `pitaka-bridge` is consumed as a pinned git dependency (`github:...#v1.2.0`), and `packages/ui-tokens` the same way via a scoped tag.

Pinning is the point. In a monorepo a bridge change reaches every consumer silently, and the break surfaces at runtime inside a WebView. With pins, adopting a new contract is a version bump in a PR: a diff someone reviews, per app, on that app's schedule.

## Consequences

Contributors clone more than one repo, and one contract change becomes several PRs. `scripts/dev-setup.sh` in `pitaka-app` clones the siblings and starts everything, so setup stays one command. P0 is deliberately a single repo because no H5 app exists yet.

## When this would change

Fold the H5 apps back into `pitaka-app` if a bridge change forces same-day pin bumps in both H5 repos twice running, or if the bridge reaches v1 with no CI job exercising the host against both H5 apps at their pinned versions. Without that check the drift is invisible again and the split buys nothing.

*Draft — revise in my own words before treating this as final.*
