# Product-per-variant uniqueness — rollout guard

## Change
The Prisma model declares `Product.publicationVariantId` unique. The additive SQL migration creates the corresponding unique index; it does not delete or rewrite products.

## Evidence (25 Nov 2026)
A read-only production aggregate against `public.Product` returned:
- product rows: 0
- non-null variant references: 0
- null variant references: 0
- duplicate-reference excess: 0

No product data or schema was changed by that query.

## CI
Website CI prepares an isolated PostgreSQL schema with `prisma db push`. The new integration test attempts a duplicate product with a different slug and expects PostgreSQL/Prisma `P2002`, then verifies exactly one product remains for the variant. CI does not apply the migration file itself.

## Production gate
**Do not run this migration or `prisma migrate deploy` in production from this PR.** The production Prisma/Supabase migration baseline is still incomplete. Reconcile the baseline and deployment method first, then apply this additive index in an approved migration window and verify the constraint in the catalog.
