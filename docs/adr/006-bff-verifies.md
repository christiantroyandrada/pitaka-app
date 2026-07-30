# ADR 6: The BFF verifies signatures rather than relaying them

**Status:** Accepted
**Date:** 2026-07-30

## Context

P0 has no network layer. Later phases add an Express BFF under `services/mock-api`, plus H5 mini-apps that never hold a signing key; they ask the native host through `auth.signRequest`, which returns `{ signature, timestamp, nonce, keyId }`.

That leaves the question of who actually checks the signature. The production system I worked in decoded part of the signed blob to harvest correlation ids and relayed it onward without verifying, so the only component able to reject a forged request sat several hops past the boundary the team owned.

## Decision

The BFF verifies every request it accepts. It recomputes HMAC-SHA256 over `${method}\n${path}\n${timestamp}\n${nonce}\n${sha256(body)}`, rejects a timestamp outside five minutes as `CLOCK_SKEW`, and a nonce it has seen as `NONCE_REPLAYED`, both 401. The nonce protects the signature and `Idempotency-Key` protects the operation, so a legitimate retry signs afresh and still resolves to the original transaction. Idempotency itself stays owned by the ledger, as ADR 10 sets out: the BFF looks the key up rather than keeping a parallel store of responses. Error codes mirror the bridge's `ErrorCode` union and the domain's own, such as `IDEMPOTENCY_KEY_REUSED` in `src/domain/transfer.ts`.

## Consequences

The nonce set lives in memory, evicted past the skew window. A restart clears it, so a retry spanning a restart could re-sign and re-execute; the ledger still refuses to double-spend the same key, but the replay protection gap is real and is what a durable nonce store buys you in production. Unsigned curl stops working against the BFF, so the dev README owes a signing helper.

The shared symmetric demo secret is a teaching simplification: it proves the caller holds the key, not which user is calling. Identity stays in `X-Session-Id`, resolved server-side. A real wallet signs asymmetrically with a device-bound key in the platform keystore and gives the server only the public half.

## When this would change

- A second BFF instance, or restarts during normal use: the nonce set moves to Redis with a TTL.
- Real user data, or accounts outside the seeded demo set: per-device ECDSA replaces the shared secret.
- A real upstream appears behind the BFF: verification is added there as well, never moved there.

*Draft. Revise in my own words before treating this as final.*
