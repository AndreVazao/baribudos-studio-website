# PayPal Capture Authorization — Design Review (2026-11-19)

**Status:** proposal only; no runtime changes or migrations applied.  
**Related:** [Website issue #45](https://github.com/AndreVazao/baribudos-studio-website/issues/45), [PR #44](https://github.com/AndreVazao/baribudos-studio-website/pull/44).

## Evidence reviewed

Current `main` (`d5dc761671496b91b0360a5bd43d2679b121fba3`):

- `POST /api/checkout/paypal/create-order` accepts a product and optional email, creates a local pending checkout, creates a PayPal order, and stores its provider order ID.
- `POST /api/checkout/paypal/capture-order` accepts `orderId`, resolves `Checkout.providerRef`, verifies provider and pending/paid status, then captures and validates the PayPal response before transactional fulfillment.
- Capture does **not** currently call `getCurrentUser()`, compare the session user to `Checkout.userId`, or require a checkout-specific guest capability.
- Guest checkout is an intentional flow. A blanket login requirement would be a breaking change.
- `Checkout` currently has no persisted capture-capability hash, expiry or consumed marker. No schema change is proposed in this document.

This is a static code finding and security design gap, not proof that an attacker can capture a real order. PayPal sandbox/production behavior was not tested.

## Required authorization contract

### Authenticated checkout

1. Resolve the checkout locally from the provider order reference; never trust client-supplied checkout/user IDs.
2. Require an active server-verified session.
3. Require `session.userId === checkout.userId`.
4. Check the checkout is for PayPal, still pending (or already paid for a safe idempotent response), and tied to the expected provider order.
5. Preserve provider-side capture validation: order ID, checkout `custom_id`, completed capture, exact stored amount and currency.
6. Capture and local payment/library fulfillment must remain replay-safe and transactionally consistent.

### Guest checkout

1. Guest capture must not rely on the PayPal order ID as a secret; it is a reference, not an authorization capability.
2. Issue a cryptographically random capability (minimum 256 bits) bound to one local checkout, with a short expiry and purpose.
3. Persist only a hash of the capability, its expiry, and consumed state against that checkout. Compare hashes in constant time.
4. Return/store the capability in a secure, HttpOnly, SameSite=Lax cookie scoped to the capture endpoint; set Secure in production. Do not include it in URLs, logs, or PayPal requests.
5. Validate request Origin/CSRF controls for the capture POST. Ensure capability and checkout/provider reference refer to the same checkout.
6. Consume the capability in the same database transaction as successful payment state and library entitlement. If provider capture succeeds but the local transaction fails, preserve a safe retry/reconciliation path without granting access twice.
7. Paid/replayed requests return a safe idempotent result only after authorization has been satisfied; do not use the public order ID alone to bypass the capability/session check.

**Schema dependency:** strict one-time guest capability semantics require persisted hash/expiry/consumption state or an equivalent durable mechanism. Do not implement a stateless signed token and call it one-time. Any schema/migration proposal must be separate, reviewed, tested on disposable PostgreSQL, and coordinated with deployment; production migration remains prohibited without explicit authorization.

## Recommended state transition

`PENDING + valid owner/capability` → provider capture → validate provider response → one DB transaction: `PAID`, entitlement grants, capability consumed → success.

Failures before provider capture leave checkout pending. If provider capture is completed but local transaction fails, retry using the same PayPal request id and reconcile provider state before any entitlement grant. Never turn an arbitrary failed/canceled checkout back into payable.

## Threat and regression test matrix

- No session and no guest capability → 401/403; PayPal capture not called.
- Signed-in wrong user → 403; capture not called.
- Disabled/expired/revoked session → deny; capture not called.
- Missing, malformed, expired, wrong-checkout, wrong-order, hash-mismatch or already-consumed guest capability → deny; capture not called.
- Valid guest capability with correct checkout → capture can proceed; verify provider order ID, `custom_id`, status, amount and currency.
- Guest checkout still works end-to-end without requiring login.
- Authenticated checkout works only for the owning active user.
- Replay after successful fulfillment is idempotent and cannot create duplicate library grants or recapture.
- Concurrent captures: one effective state transition and one entitlement set.
- PayPal capture success + local transaction failure: retry/reconciliation is safe.
- Invalid provider response, mismatched amount/currency/custom ID → no library grant.
- Capture POST enforces same-origin/CSRF controls; capability cookie is HttpOnly, Secure (production), SameSite=Lax, narrowly scoped and cleared after consumption.
- Payment routes return stable public error codes; raw provider/database exceptions are not exposed (separate PR #44).

## Implementation sequencing (not executed)

1. Review this contract and the guest checkout UX.
2. Add the minimal capability persistence fields and a migration draft; test only on disposable PostgreSQL, with rollback plan. No production apply.
3. Implement capability issuance and owner/capability verification in a branch; keep guest and signed-in paths distinct.
4. Add isolated route/unit/integration tests above, plus PayPal sandbox tests if an existing free sandbox configuration is available; no paid resources.
5. Inspect PR diff, CI, and preview. Keep Draft. Do not merge, deploy manually, rotate secrets, or change production data/infrastructure without explicit authorization.

## Out of scope / not verified

- No PayPal sandbox or live payment calls.
- No production schema, data, credentials, secrets, permissions, deployment or infrastructure inspected/changed.
- No conclusion that a particular provider order ID is currently exposed; that requires tracing the checkout client and PayPal return flow.

## Product-owner boundary: Studio vs public Website (2026-11-20)

- **Studio is private household production/editorial software**, restricted to the owner and explicitly authorized close family (wife and children). It is not public, a SaaS product, or a customer portal.
- **The Website is the public commerce/distribution surface**, controlled by the family/owner as producer and publisher. Catalog, prices, publication, administration and operations remain owner-side capabilities.
- **Website customer accounts are customer-only.** They may access their own account, checkout, orders, receipts/support and purchased library, subject to authorization. They must never access Studio, Studio APIs, production projects, drafts/manuscripts, IP/canon, private media/voices/consents, production pipelines, administrative or commercial controls, pricing/catalog management, publication or internal operations.
- Studio and Website customer authentication are distinct trust boundaries: no shared credentials, session, implicit SSO or session acceptance across systems. Studio-to-Website publishing is an authenticated server-to-server integration for editorially approved, versioned and checksum-verified packages.
- UI hiding is not authorization. Enforce customer-vs-owner/admin permissions server-side and at data/storage boundaries. Capture authorization grants access only to the matching checkout context and never administrative or Studio capabilities.

This is an owner-confirmed architecture requirement; it does not change runtime or imply these boundaries have already been verified in production.


## Implementation status — 2026-11-20 (Draft PR)

A focused implementation is now proposed on branch `security/paypal-capture-capability-2026-11-20`:

- Guest orders receive a cryptographically random 256-bit capability. Only its SHA-256 hash, expiry and consumed timestamp are stored on the local checkout.
- The raw capability is set only in a checkout-specific HttpOnly cookie, scoped to the capture endpoint, SameSite=Lax, Secure in production, and valid for 15 minutes. It is not returned in JSON, placed in the PayPal URL or sent to PayPal.
- Authenticated checkouts require the active server-side session owner to match `Checkout.userId`. Guest checkouts require the matching capability; a logged-in session for a different user does not override the guest checkout context.
- Capture rejects a missing or cross-origin Origin header. The provider order ID remains a lookup reference, not authorization.
- The guest capability is consumed by the same conditional database update that changes the checkout from PENDING to PAID. The entitlement writes remain in the same Prisma transaction. A consumed capability can only replay the already-paid result while still valid; it cannot initiate another capture.
- PayPal continues to receive the stable local checkout ID as `PayPal-Request-Id`, preserving provider retry behavior.

### Validation and rollout gates

- CI uses an ephemeral PostgreSQL service and `prisma db push`; it does not apply production migrations.
- An additive Prisma migration draft is included for review. The active repository currently has only the historical `20260330_add_saga_visual_sets` migration source, while the production Supabase migration history is separately recorded. The production migration baseline is not reconciled; **do not run `prisma migrate deploy` or apply this SQL to production**.
- Existing guest PayPal orders created before this capability is deployed have no capability cookie/hash. They must be allowed to expire or be otherwise reconciled before rollout; do not add an insecure fallback to order-ID-only capture.
- No PayPal sandbox/live calls, production database writes, deployments, secret changes or infrastructure changes were performed in this implementation pass.
- The PR must remain Draft until CI, route tests, disposable-PostgreSQL concurrency tests, migration review and the deployment compatibility plan are all verified.
