# PayPal capture — verification gaps and rollout gates

**Date:** 2026-11-20  
**Scope:** Draft PR #47, branch `security/paypal-capture-capability-2026-11-20`.  
**Purpose:** distinguish what the current branch proves from what still needs implementation or external verification. This document does not authorize production changes.

## Verified implementation on the PR head

- Guest checkout issues a 256-bit random capability, stores its SHA-256 hash and expiry on the local checkout, and sets the raw value only in a checkout-specific HttpOnly cookie.
- The capability cookie is scoped to the capture route, uses SameSite=Lax, Secure in production, and has a 15-minute lifetime.
- The capture route requires an exact same-origin Origin value, resolves the local checkout, checks owner-or-capability authorization, and rejects non-PENDING checkouts before calling the PayPal provider.
- The guest capability is consumed by the conditional PENDING-to-PAID update in the same Prisma transaction as customer-library entitlement writes.
- The provider request uses the local checkout ID as `PayPal-Request-Id`.
- PR CI on head `081c2492e988331f2a2a8ebd6c49cf9548b69020` passed Website CI run [44724302096](https://github.com/AndreVazao/baribudos-studio-website/actions/runs/44724302096), including typecheck, unit tests, isolated PostgreSQL integration tests and build.

## Authentication claim — corrected boundary

The current Website authentication implementation on `main` is not a persisted, individually revocable server-side session store:

- `src/lib/auth-session.ts` verifies an HS256 JWT with a 30-day expiry, then resolves the user record by JWT subject.
- `src/lib/session-policy.mjs` accepts the record only when `user.isActive === true`.
- `src/app/api/auth/logout/route.ts` clears the browser cookie; it does not revoke a copied, still-valid JWT.
- PR #47 binds an authenticated checkout to the user returned by this verification and checks that the user ID matches `Checkout.userId`.

Therefore the precise claim is **signed Website JWT verification plus active-user lookup and checkout-owner matching**. It is not proof of per-session persistence, revocation, or immediate logout invalidation. Do not describe this as an individually revocable server-side session. Persisted session IDs/versioning, revocation and logout invalidation remain separate security work.

## Route-test coverage — limit

`tests/paypal-capture-capability.test.mjs` tests the capability helper and reads the route source to assert guard ordering. That is a static source-order regression test, not an HTTP-level route integration test.

`tests/payment-fulfillment.integration.test.ts` exercises the local PostgreSQL fulfillment transaction, including the one-time PENDING-to-PAID transition and entitlement writes. It does not invoke the actual capture route or the PayPal provider.

Before rollout, add route-level tests proving that missing/invalid Origin, missing guest capability, wrong authenticated owner, expired/consumed capability and non-payable checkout all return before the provider function is called. Include a valid guest path and a valid owner path using a mocked provider.

## Provider concurrency and unknown outcomes — bounded lookup added, reservation still unresolved

The handler now performs one authenticated PayPal Orders v2 **Show order details** request for each authorized pending-checkout attempt:

- If the provider order is `COMPLETED`, the returned order object is validated against the local order ID, checkout custom ID, exact amount and currency, then passed to the existing local fulfillment transaction. No second capture request is issued.
- If the provider order is `APPROVED`, the handler sends the capture request with the local checkout ID as `PayPal-Request-Id`.
- Any other provider status is rejected without a capture call or entitlement write.
- Provider lookup errors fail closed; the handler does not guess that capture is safe.

This is a bounded, request-driven reconciliation path, not a polling loop or webhook consumer. PayPal documents the Show order details endpoint as returning the order status and capture details; a completed order has status `COMPLETED` and a completed capture in `purchase_units[].payments.captures[]`. See the official [Orders v2 Show order details endpoint](https://developer.paypal.com/sdk/orders/v2/orders-get/) and [Orders API integration guide](https://developer.paypal.com/api/rest/integration/orders-api).

The stable local checkout ID is still passed as `PayPal-Request-Id` for the APPROVED→capture path. Provider idempotency retention is finite and API-specific; the Orders v2 reference documents a default six-hour retention period. This must not be treated as a permanent exactly-once guarantee.

**Still unresolved:** two simultaneous requests can both read `APPROVED` before either capture completes. Both may reach PayPal with the same request ID. The local conditional transaction protects entitlement fulfillment, but it is not a durable provider-call reservation or a distributed lock. The deterministic concurrent test models provider idempotency; it does not prove PayPal's live concurrency semantics.

Required before rollout:

1. Keep the concurrent capture test and exact stable request-key assertion.
2. Keep the timeout-after-provider-success test proving a subsequent request reads `COMPLETED` and skips another capture call.
3. Consider a durable local capture-attempt reservation only after the production migration baseline is reconciled; do not introduce an unreviewed production schema change.
4. Do not mark a checkout FAILED merely because the HTTP response was lost after provider success.
5. Do not introduce an order-ID-only fallback for older guest checkouts that have no capability.

Official references to re-check against the exact PayPal Orders v2 API contract before production use:
- https://developer.paypal.com/api/rest/requests/
- https://developer.paypal.com/serversdk/php/api-endpoints/orders/capture-order

## Migration and compatibility gates

- The branch adds three nullable capability columns and a unique index, plus a new `migration_lock.toml`.
- The default migration directory currently contains only the historical `20260330_add_saga_visual_sets` SQL migration; that is not a complete baseline for the active commerce schema.
- The additive capability migration is a draft only. Production schema and migration history have not been reconciled. Do not run `prisma migrate deploy`, apply SQL, or alter production.
- Pending guest checkouts created before rollout have no capability hash/cookie. They require an explicit expiry/reconciliation policy; never fall back to order ID alone.
- CI uses an isolated PostgreSQL service and `prisma db push`; a green CI run is not production migration validation.
- No real PayPal call, production payment, production data write, deployment, secret change or infrastructure change was performed.

## Review disposition

Keep PR #47 Draft. The capability/owner binding is a meaningful improvement, but it is not rollout-ready until route-level authorization tests, provider concurrency/unknown-outcome reconciliation, the migration baseline and legacy pending guest-checkout handling are resolved. Website JWT session revocation remains a separate security dependency.


## Follow-up verification — 21 Nov 2026

Added and extended `tests/paypal-capture-provider-idempotency.test.mjs`:
- Exercises the actual `capturePayPalOrder()` wrapper with mocked Fetch and verifies that the local checkout ID is sent in the `PayPal-Request-Id` header.
- Exercises the actual `getPayPalOrder()` wrapper and verifies the authenticated GET to `/v2/checkout/orders/{id}` uses `cache: no-store`.
- Runs two concurrent handler calls against a simulated idempotent provider and verifies both use the same checkout-derived request key while the simulated fulfillment grants one entitlement.
- Simulates a timeout after the provider accepts capture, then retries; the second request reads provider status `COMPLETED`, skips a second capture call and performs one local fulfillment.

**Limit:** these are deterministic unit simulations, not a live PayPal/Sandbox test. They do not prove provider retention or network behavior. Two simultaneous requests can still both observe `APPROVED` and call capture with the same request ID; local fulfillment is atomic, but there is no durable provider-call reservation. The Next.js cookie adapter, production migration baseline, legacy guest-checkout compatibility and persisted session revocation remain rollout blockers.