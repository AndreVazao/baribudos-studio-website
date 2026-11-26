import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const migration = (name) => readFileSync(
  new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url),
  "utf8"
)

const baselineName = "20260301000000_existing_production_baseline"
const baseline = migration(baselineName)

test("production baseline describes only the pre-feature Prisma schema", () => {
  for (const table of [
    "StudioSettings",
    "IntellectualProperty",
    "Series",
    "Publication",
    "PublicationVariant",
    "PublicationAsset",
    "User",
    "Product",
    "BundleGroup",
    "BundleGroupItem",
    "CustomerLibrary",
    "Checkout",
    "CheckoutItem"
  ]) {
    assert.ok(baseline.includes(`CREATE TABLE "${table}"`))
  }

  assert.match(baseline, /CREATE TYPE "ProductType"/)
  assert.match(baseline, /CREATE TYPE "CheckoutProvider"/)
  assert.match(baseline, /CREATE TYPE "CheckoutStatus"/)
  assert.match(baseline, /CREATE TYPE "UserRole"/)
  assert.match(baseline, /CREATE INDEX "idx_Product_publicationVariantId"/)
  assert.doesNotMatch(baseline, /CREATE UNIQUE INDEX "Product_publicationVariantId_key"/)
  assert.doesNotMatch(baseline, /CREATE TABLE "SagaVisualSet"/)
  assert.doesNotMatch(baseline, /captureCapability(Hash|ExpiresAt|ConsumedAt)/)
  assert.doesNotMatch(baseline, /captureLease(Id|ExpiresAt)/)
  assert.doesNotMatch(baseline, /CREATE TABLE "system_metadata"/)
  assert.doesNotMatch(baseline, /DROP TABLE|TRUNCATE|DELETE FROM/i)
})

test("later migrations add exactly the production objects found missing", () => {
  const saga = migration("20260330_add_saga_visual_sets")
  const sagaRls = migration("20260331120000_saga_visual_set_rls")
  const capability = migration("20261120_paypal_capture_capability")
  const productUnique = migration("20261125103600_product_publication_variant_unique")

  assert.match(saga, /CREATE TABLE IF NOT EXISTS "SagaVisualSet"/)
  assert.match(sagaRls, /ALTER TABLE "SagaVisualSet" ENABLE ROW LEVEL SECURITY/)
  assert.match(capability, /captureCapabilityHash/)
  assert.match(capability, /captureCapabilityExpiresAt/)
  assert.match(capability, /captureCapabilityConsumedAt/)
  assert.match(productUnique, /CREATE UNIQUE INDEX IF NOT EXISTS "Product_publicationVariantId_key"/)
  assert.match(productUnique, /DROP INDEX IF EXISTS "idx_Product_publicationVariantId"/)

  const names = [
    baselineName,
    "20260330_add_saga_visual_sets",
    "20260331120000_saga_visual_set_rls",
    "20261120_paypal_capture_capability",
    "20261125103600_product_publication_variant_unique"
  ]
  assert.deepEqual(names, [...names].sort())
})

test("Supabase RLS reconciliation keeps public reads and removes client write grants", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20261126190000_reconcile_public_and_owner_rls.sql", import.meta.url),
    "utf8"
  )
  assert.match(sql, /REVOKE ALL PRIVILEGES/)
  assert.match(sql, /GRANT SELECT ON TABLE/)
  assert.match(sql, /Users can read own checkouts/)
  assert.match(sql, /Users can read own checkout items/)
  assert.match(sql, /Users can read own library entries/)
  assert.match(sql, /Users can read own profile/)
  assert.doesNotMatch(sql, /ON TABLE public\.system_metadata/i)
  assert.doesNotMatch(sql, /GRANT (INSERT|UPDATE|DELETE)/i)
})
