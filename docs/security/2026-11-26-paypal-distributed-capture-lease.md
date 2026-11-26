# PayPal distributed capture lease

**Status:** implementation in draft PR; no production migration or payment execution.

## Problem

The capture handler previously used a process-local single-flight map. That prevents duplicate captures only inside one Node.js process. Multiple Vercel instances can still race on the same pending checkout. PayPal's stable request ID is a recovery/idempotency backstop, not a substitute for a local concurrency gate.

## Design

- Persist `captureLeaseId` and `captureLeaseExpiresAt` on the local Checkout row.
- Acquire with one atomic Prisma `updateMany` constrained by checkout ID, PayPal provider, provider order reference, PENDING status, and a null/expired lease.
- Lease TTL is three minutes, longer than the normal serverless request window. If an instance dies, another request can recover after expiry.
- The provider GET and capture occur only after a successful lease acquisition.
- PayPal capture continues to use the stable checkout ID as `PayPal-Request-Id`.
- Transactional fulfillment checks that the same lease ID is still present and unexpired in its conditional UPDATE. A stale instance cannot grant entitlements after another instance has taken over.
- Successful fulfillment marks PAID and clears the lease in the same database transaction as entitlement grants.
- Failure paths release only the lease owned by that request. If release fails, the lease expires automatically.
- The process-local single-flight map remains as an optimization, not the correctness boundary.

## Recovery cases

| Case | Result |
|---|---|
| Another instance owns a live lease | 409 `capture_in_progress`; no PayPal call |
| Instance dies before provider call | Lease expires; retry can acquire |
| Provider capture succeeded but response was lost | Retry reads provider order state and reconciles COMPLETED |
| Old instance resumes after lease takeover | Conditional fulfillment rejects stale lease |
| Local transaction succeeds | Checkout becomes PAID, entitlement grants are idempotent, lease cleared |
| Lease release fails | Lease expiry enables later recovery |

## Migration boundary

A Prisma migration adds the two nullable lease fields and a contention index. Production currently has no `public._prisma_migrations` table, so Prisma migration baseline/reconciliation is a separate mandatory gate. The current production Checkout table also does not contain the guest capability columns from the existing draft migration. Do not apply either migration or deploy this code until a reviewed baseline and schema reconciliation are completed. No production schema or data was changed during this work.

## Verification plan

- Unit tests for lease contention, cross-instance exclusion, stale lease owner, expiry and transactional clearing.
- CI Prisma client generation, typecheck, unit tests and build.
- Disposable PostgreSQL migration/transaction tests.
- PayPal Sandbox only after explicit approval and with a dedicated test product/account; no live capture.


## Verification checkpoint — 26 Nov 2026

- Tested commit: `aab9e539ea212964c3656ceade40de51a0d1317f`.
- Website CI completed successfully, including isolated PostgreSQL migration deployment and ledger/schema verification, Supabase roles/RLS/grants checks, typecheck, unit/integration tests, and build.
- This is validation of the PR branch in disposable CI only—not production baseline certification.
- PR #56 is still Draft and stacked on PR #47, which is also Draft and targets `main`. Do not merge #56 independently or retarget to `main` before resolving the stack and reviewing the production migration-baseline evidence.
- Remaining gates: independent review of capture/capability/lease edge cases; read-only production schema reconciliation and reviewed baseline; guest-checkout recovery/expiry policy; approved sandbox verification; explicit rollout/backup/maintenance authorization. No migration, deployment, or payment was run against production.

