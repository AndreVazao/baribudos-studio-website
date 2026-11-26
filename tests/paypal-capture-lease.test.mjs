import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/payment-fulfillment.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fulfillPaidCheckout } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function makeTransaction(checkout, updateCount = 1) {
  const calls = [];
  const tx = {
    checkout: {
      findUnique: async () => ({ ...checkout, items: checkout.items || [] }),
      updateMany: async (args) => { calls.push(["updateMany", args]); return { count: updateCount }; },
    },
    customerLibrary: {
      upsert: async (args) => { calls.push(["upsert", args]); },
    },
  };
  return { tx, calls };
}

function pendingCheckout(overrides = {}) {
  return {
    id: "checkout-lease-1",
    provider: "PAYPAL",
    providerRef: "ORDER-LEASE-1",
    userId: "customer-1",
    status: "PENDING",
    captureCapabilityHash: null,
    captureCapabilityExpiresAt: null,
    captureCapabilityConsumedAt: null,
    captureLeaseId: "lease-current",
    captureLeaseExpiresAt: new Date(Date.now() + 60_000),
    items: [{ productId: "product-1" }],
    ...overrides,
  };
}

test("fulfillment transition is conditional on the exact unexpired lease owner", async () => {
  const { tx, calls } = makeTransaction(pendingCheckout());
  const result = await fulfillPaidCheckout(tx, {
    checkoutId: "checkout-lease-1",
    provider: "PAYPAL",
    providerRef: "ORDER-LEASE-1",
    captureLeaseId: "lease-current",
  });

  assert.deepEqual(result, { ok: true, alreadyPaid: false });
  const update = calls.find(([name]) => name === "updateMany")[1];
  assert.equal(update.where.captureLeaseId, "lease-current");
  assert.ok(update.where.captureLeaseExpiresAt.gt instanceof Date);
  assert.equal(update.data.status, "PAID");
  assert.equal(update.data.captureLeaseId, null);
  assert.equal(update.data.captureLeaseExpiresAt, null);
  assert.equal(calls.filter(([name]) => name === "upsert").length, 1);
});

test("a stale lease owner cannot fulfill after another instance has acquired the lease", async () => {
  const { tx, calls } = makeTransaction(pendingCheckout({ captureLeaseId: "lease-new-owner" }));
  const result = await fulfillPaidCheckout(tx, {
    checkoutId: "checkout-lease-1",
    provider: "PAYPAL",
    providerRef: "ORDER-LEASE-1",
    captureLeaseId: "lease-old-owner",
  });

  assert.deepEqual(result, { ok: false, reason: "capture_lease_lost" });
  assert.equal(calls.some(([name]) => name === "updateMany"), false);
  assert.equal(calls.some(([name]) => name === "upsert"), false);
});

test("expired lease cannot transition a checkout to paid", async () => {
  const checkout = pendingCheckout({ captureLeaseExpiresAt: new Date(Date.now() - 1) });
  const { tx, calls } = makeTransaction(checkout, 0);
  const result = await fulfillPaidCheckout(tx, {
    checkoutId: "checkout-lease-1",
    provider: "PAYPAL",
    providerRef: "ORDER-LEASE-1",
    captureLeaseId: "lease-current",
  });

  assert.deepEqual(result, { ok: false, reason: "capture_lease_lost" });
  assert.equal(calls.some(([name]) => name === "upsert"), false);
});

test("schema and migration persist the distributed lease fields and contention index", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const migration = await readFile(new URL("../prisma/migrations/20261126064000_paypal_capture_lease/migration.sql", import.meta.url), "utf8");
  assert.match(schema, /captureLeaseId\s+String\?/);
  assert.match(schema, /captureLeaseExpiresAt\s+DateTime\?/);
  assert.match(schema, /@@index\(\[status, captureLeaseExpiresAt\]\)/);
  assert.match(migration, /ADD COLUMN "captureLeaseId" TEXT/);
  assert.match(migration, /ADD COLUMN "captureLeaseExpiresAt" TIMESTAMP\(3\)/);
  assert.match(migration, /Checkout_status_captureLeaseExpiresAt_idx/);
});
