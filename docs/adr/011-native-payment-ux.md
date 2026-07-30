# ADR 11: Native owns the payment confirmation UX

**Status:** Accepted
**Date:** 2026-07-30

## Context

An H5 microfrontend is a static SPA at a config-supplied URL, loaded because remote config said so, and replaceable without an app release. Anything it renders sits outside the release gate that ships the native app.

The confirmation moment is where the user commits an amount and authenticates. In web content, both the credential entry and the amount shown sit in that replaceable layer, with a URL as the trust boundary.

## Decision

The H5 requests a payment and the host confirms it. `payments.requestPayment({ amountCentavos, billerId, reference, idempotencyKey })` opens a native sheet over the WebView, built from the `MpinInput` and `AmountText` already in `src/ui/`. The host performs the movement itself through `applyTransfer` (`src/domain/transfer.ts`) and resolves the H5's promise with a receipt. The H5 never sees the MPIN, never signs a money-moving request (`auth.signRequest` checks `(method, path)` against a compile-time allowlist and rejects those routes), and never renders the amount being approved.

The host also caps any native UI it renders for an H5. `ui.showLoading` self-dismisses after 30 s and on WebView reload or unmount, so an H5 that crashes or navigates mid-flight can't leave an overlay wedging the shell.

## Consequences

Payment UX stops moving at web speed. Changing the sheet needs an app release, so the independent-deploy story doesn't cover an H5's most important screen. Each new payment shape costs a native method and contract tests. Amount formatting now exists twice, native and web, and can drift.

The H5's timeout frees it while the sheet may still be open, so its own `idempotencyKey` is what keeps a retry from paying twice. Nothing hangs forever on either side.

## When this would change

- A biller needs a confirmation step the sheet can't express, such as an issuer OTP field: add typed params to `requestPayment`; don't hand rendering back.
- The 30 s loading cap starts firing on real slow-network payments: raise it to a measured number, keep the cap.
- H5 bundles ship inside the app at a verified pinned version: the origin argument weakens, the credential argument doesn't. MPIN entry stays native.

*Draft. Revise in my own words before treating this as final.*
