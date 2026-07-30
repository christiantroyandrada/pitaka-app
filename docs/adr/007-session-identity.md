# ADR 7: Session identity is separate from transport integrity

**Status:** Accepted
**Date:** 2026-07-30

## Context

The planned BFF verifies an HMAC-SHA256 signature over method, path, timestamp, nonce and body hash. A signature proves the caller holds the key, not which user is calling; with a shared key it can't.

Conflating the two is a real failure class. In a production wallet I worked in, the web layer delegated signing to native so it never held a key, which was right, but the BFF relayed the signed blob without verifying it and identity rode in the request payload.

P0 already avoids this locally: `StoreTransferRequest` in `src/data/walletStore.ts` has no `from`. The store supplies `ACCOUNTS.user` before calling `applyTransfer`, so a caller has no field in which to name a debit account.

## Decision

Identity is a separate opaque `sessionId` issued by `POST /auth/login` (mobile + MPIN) with a 30-minute sliding TTL. The native host keeps it in `expo-secure-store` and sends `X-Session-Id`; H5 sees it only via `auth.getSession`, never as a bearer token. The BFF resolves the session to an `account_id` server-side and derives the acting account from the session alone. `TransferRequest.from` is server-set; a body field naming an account is ignored, not trusted. An unknown or expired session is `401 SESSION_EXPIRED`, which returns the user to Login.

## Consequences

Signature and session fail independently, with distinct codes (`INVALID_SIGNATURE` vs `SESSION_EXPIRED`), so a 401 is diagnosable. Costs: session state lives in the BFF in memory, so a restart logs everyone out; a stolen `sessionId` is sufficient on its own, since the shared key adds nothing and nothing binds a session to a device; and the API can't express one actor operating on another account.

## When this would change

- A second actor type appears, such as a partner crediting a user's wallet. That needs explicit `actor` and `subject` with a server-checked rule, not a bare session.
- Sessions must survive a BFF restart: replace the in-memory store with a signed short-TTL token and a revocation list.
- Keys become per-device and bound to an account at registration, at which point `keyId` carries identity and `X-Session-Id` is redundant.

*Draft. Revise in my own words before treating this as final.*
