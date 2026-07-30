# ADR 5: Native signs requests and hashes what it signs

**Status:** Accepted
**Date:** 2026-07-30

## Context

H5 pages need to call the BFF over signed HTTP, but a WebView bundle is the least trustworthy code in the system. The production system I worked in delegated signing to native over a bridge call, so the key never reached the web layer. That part was right. What it left open was what the signer accepts, and which routes it will sign for. The bridge is P2 work; the method shape is decided now because it constrains everything built on top of it.

## Decision

The HMAC key lives in `expo-secure-store` in the host and is never returned over the bridge.

`auth.signRequest({ method, path, body })` takes the body, not a `bodyHash`. Native computes `sha256(body)` and signs `${method}\n${path}\n${timestamp}\n${nonce}\n${sha256(body)}`. A caller-supplied hash would make native a blind signing oracle, attesting to bytes it never saw — the signature would then say nothing about the request that actually goes out.

Native also checks `(method, path)` against a compile-time allowlist of H5-reachable routes and rejects the rest with `UNAUTHORIZED`. Money movement is not on that list: `payments.requestPayment` is performed by native behind its own confirmation sheet. Same rule as `registryKey` in `src/config/schema.ts` — bound untrusted input at the boundary, not at the call site.

## Consequences

Native must serialise the body byte-identically to what it posts, so JSON is fixed as the wire format and native signs the exact string it sends. Bodies cross postMessage twice. Adding an H5-reachable route becomes a native release rather than a config change — friction I want. Symmetric HMAC with a shared demo key stays a teaching simplification: it proves key possession, not identity (ADR 7).

## When this would change

- An H5 needs file upload, or a body large enough that double-marshalling is measurable: signing moves to native performing the whole request.
- The allowlist passes roughly ten routes or needs per-user scoping: it becomes a capability the host fetches at login, not a compile-time constant.
- Real keys ever enter the picture: replaced by asymmetric signing with a device-bound keystore key.

*Draft — revise in my own words before treating this as final.*
