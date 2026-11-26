-- Additive commercial-integrity constraint. No product rows existed during the
-- 2026-11-25 read-only production check; do not apply until migration baseline is reconciled.
CREATE UNIQUE INDEX IF NOT EXISTS "Product_publicationVariantId_key"
  ON "Product" ("publicationVariantId");

-- The pre-existing non-unique helper index is redundant after the unique index is created.
DROP INDEX IF EXISTS "idx_Product_publicationVariantId";
