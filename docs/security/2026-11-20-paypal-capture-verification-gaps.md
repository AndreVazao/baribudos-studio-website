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

## Provider concurrency and unknown outcomes — unresolved

The current route calls `capturePayPalOrder(orderId, checkout.id)` **before** the local conditional PENDING-to-PAID transaction. The transaction protects local fulfillment and entitlement idempotency, but it is not a reservation that prevents two simultaneous requests from reaching PayPal.

The stable local checkout ID is passed as `PayPal-Request-Id`, which is useful for provider retries. Provider idempotency retention is finite and API-specific; the Orders v2 capture reference documents a default six-hour retention period. This must not be treated as a permanent exactly-once guarantee.

Required before rollout:

1. Add a route/provider concurrency test that starts two capture requests for the same checkout and asserts both use exactly the same provider request ID.
2. Test timeout-after-provider-success and retry after an unknown response.
3. Define a bounded reconciliation path that checks provider state before granting an entitlement or issuing another capture attempt.
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
