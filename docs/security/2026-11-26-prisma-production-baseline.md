# Prisma production baseline reconciliation — 26 November 2026

## Read-only production evidence

The production PostgreSQL catalog was inspected through Supabase read-only queries. No production DDL, migration, data write, or secret change was performed.

Observed state:

- `public._prisma_migrations` does not exist.
- The Prisma-managed base tables exist, except `SagaVisualSet`.
- `Product.publicationVariantId` has the non-unique helper index `idx_Product_publicationVariantId`; the Prisma unique index `Product_publicationVariantId_key` is absent.
- `Checkout` has the original nine columns. It does not yet have `captureCapabilityHash`, `captureCapabilityExpiresAt`, `captureCapabilityConsumedAt`, `captureLeaseId`, or `captureLeaseExpiresAt`.
- There are two User rows and zero Product/Checkout rows. The unique-index migration therefore has no existing product duplicates to reconcile at this snapshot.
- `public.system_metadata` exists outside the Prisma schema, has RLS enabled, and its client grants are managed by its own Supabase migration. It is intentionally excluded from the Prisma baseline.

The current catalog also has RLS enabled on the Prisma tables. Public catalog tables have public-read policies; Checkout, CheckoutItem, CustomerLibrary and User have owner-scoped read policies. The Supabase roles currently have broader table grants than necessary, so the new Supabase migration revokes client write grants and preserves only the intended SELECT surface.

## Migration sequence

The new baseline is a full schema-creation migration for a fresh database, representing the Prisma tables before the later additive features:

1. `20260301000000_existing_production_baseline` — creates the original Prisma tables, enums, foreign keys and indexes. It does not create `system_metadata`, `SagaVisualSet`, capture-capability fields, the Product unique index or capture-lease fields.
2. `20260330_add_saga_visual_sets` — creates the missing visual-set table.
3. `20260331120000_saga_visual_set_rls` — enables RLS and public read-only access for SagaVisualSet when Supabase roles exist.
4. `20261120_paypal_capture_capability` — adds the guest capture capability fields.
5. `20261125103600_product_publication_variant_unique` — adds the unique product-per-publication-variant index and removes the redundant non-unique helper index.
6. `20261126064000_paypal_capture_lease` — adds distributed PayPal capture lease fields (introduced by the dependent lease PR).

The separate Supabase migration `20261126190000_reconcile_public_and_owner_rls.sql` preserves public catalogue reads, restricts private reads to the authenticated owner, revokes client INSERT/UPDATE/DELETE grants, and leaves `system_metadata` untouched.

## Production rollout procedure — NOT EXECUTED

This is a controlled operator procedure, not an action performed by this PR. It requires an approved maintenance window and a verified backup.

1. Confirm the live schema still matches the read-only evidence above. Re-run the catalog preflight immediately before rollout.
2. Back up the database and retain the backup identifier.
3. Deploy the code/migration files, but do not allow the application to write new checkouts during the migration window.
4. Mark only the baseline as already represented by the existing production schema:

   ```sh
   npx prisma migrate resolve --applied 20260301000000_existing_production_baseline
   ```

   This creates/updates Prisma's migration ledger; it does not execute the baseline table-creation SQL against the existing tables.
5. Apply the pending additive migrations:

   ```sh
   npx prisma migrate deploy
   npx prisma migrate status
   ```

6. Apply the Supabase RLS migration through the approved Supabase migration process. Verify the public catalogue grants and owner-scoped policies.
7. Verify `SagaVisualSet`, the capture capability columns, the unique Product index, the capture lease columns and the corresponding migration ledger rows.
8. Confirm the two existing User records remain unchanged and that `system_metadata` still exists with RLS enabled and no anon/authenticated table grants.

**Never run `prisma migrate deploy` against this production database before the baseline has been resolved as applied.** That would attempt to create tables which already exist. Do not execute `migrate resolve` or `migrate deploy` from this PR or from an automated preview workflow.

## Safety boundaries

- The baseline migration is intended to execute on a new empty database, or to be marked applied on the existing production database after preflight. It is not an idempotent repair migration for an unknown schema.
- No table is dropped or truncated; no existing User row is rewritten.
- The baseline does not manage `system_metadata`.
- The Product unique-index migration removes the old non-unique helper index only after creating the unique index. The production snapshot had zero Product rows.
- Production migration execution remains blocked pending explicit operational approval and backup verification.
