import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { fulfillPaidCheckout, isValidPayPalCapture, isValidStripePaidSession } from "@/lib/payment-fulfillment";

const suffix = randomUUID();
const ip = await prisma.intellectualProperty.create({ data: { slug: `payment-test-${suffix}`, name: "Payment Integration Test" } });
const publication = await prisma.publication.create({ data: { publicationId: `payment-publication:${suffix}`, projectId: `project:${suffix}`, projectSlug: `project-${suffix}`, channel: "website", language: "pt-PT", sourceSystem: "integration-test", status: "published", payloadJson: {}, ipId: ip.id } });
const variant = await prisma.publicationVariant.create({ data: { publicationIdRef: publication.publicationId, variantId: `payment-variant:${suffix}`, projectId: `project:${suffix}`, projectSlug: `project-${suffix}`, channel: "website", language: "pt-PT", format: "ebook", slug: `payment-test-${suffix}`, title: "Payment Test Book", description: "Integration test", price: 12.99, currency: "EUR", payloadJson: {}, published: true } });
const product = await prisma.product.create({ data: { publicationVariantId: variant.variantId, slug: variant.slug, title: variant.title, type: "EBOOK", priceCents: 1299, currency: "EUR", active: true } });
const user = await prisma.user.create({ data: { email: `payment-${suffix}@example.test`, name: "Payment Integration Test", passwordHash: "not-a-real-password-hash" } });
const paypalOrder = `PAYPAL-${suffix}`;
const stripeSession = `STRIPE-${suffix}`;
const paypalCheckout = await prisma.checkout.create({ data: { userId: user.id, provider: "PAYPAL", providerRef: paypalOrder, amountCents: 1299, currency: "EUR", status: "PENDING", items: { create: [{ productId: product.id, quantity: 1, unitAmountCents: 1299 }] } } });
const stripeFailedCheckout = await prisma.checkout.create({ data: { userId: user.id, provider: "STRIPE", providerRef: stripeSession, amountCents: 1299, currency: "EUR", status: "FAILED", items: { create: [{ productId: product.id, quantity: 1, unitAmountCents: 1299 }] } } });

after(async () => {
  await prisma.checkout.deleteMany({ where: { userId: user.id } });
  await prisma.customerLibrary.deleteMany({ where: { userId: user.id } });
  await prisma.product.deleteMany({ where: { id: product.id } });
  await prisma.publicationVariant.deleteMany({ where: { id: variant.id } });
  await prisma.publication.deleteMany({ where: { id: publication.id } });
  await prisma.intellectualProperty.deleteMany({ where: { id: ip.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.$disconnect();
});

test("PayPal capture binds order, checkout, completed capture, amount and currency", () => {
  const expected = { orderId: paypalOrder, checkoutId: paypalCheckout.id, amountCents: 1299, currency: "EUR" };
  const capture = { id: paypalOrder, status: "COMPLETED", purchase_units: [{ custom_id: paypalCheckout.id, payments: { captures: [{ status: "COMPLETED", amount: { value: "12.99", currency_code: "EUR" } }] } }] };
  assert.equal(isValidPayPalCapture(capture, expected), true);
  assert.equal(isValidPayPalCapture({ ...capture, id: "OTHER" }, expected), false);
  assert.equal(isValidPayPalCapture({ ...capture, purchase_units: [{ custom_id: "OTHER" }] }, expected), false);
  assert.equal(isValidPayPalCapture({ ...capture, purchase_units: [{ custom_id: paypalCheckout.id, payments: { captures: [{ status: "COMPLETED", amount: { value: "12.98", currency_code: "EUR" } }] } }] }, expected), false);
});

test("Stripe session requires matching provider reference, checkout metadata, paid state, amount and currency", () => {
  const session = { id: stripeSession, mode: "payment", payment_status: "paid", amount_total: 1299, currency: "eur", metadata: { checkoutId: stripeFailedCheckout.id } };
  const checkout = { id: stripeFailedCheckout.id, providerRef: stripeSession, provider: "STRIPE", amountCents: 1299, currency: "EUR" };
  assert.equal(isValidStripePaidSession(session, checkout), true);
  assert.equal(isValidStripePaidSession({ ...session, amount_total: 1300 }, checkout), false);
  assert.equal(isValidStripePaidSession({ ...session, payment_status: "unpaid" }, checkout), false);
  assert.equal(isValidStripePaidSession(session, { ...checkout, providerRef: "OTHER" }), false);
});

test("concurrent replay marks a checkout paid and grants exactly one library entitlement", async () => {
  const args = { checkoutId: paypalCheckout.id, provider: "PAYPAL" as const, providerRef: paypalOrder };
  const results = await Promise.all([prisma.$transaction((tx) => fulfillPaidCheckout(tx, args)), prisma.$transaction((tx) => fulfillPaidCheckout(tx, args))]);
  assert.equal(results.every((result) => result.ok), true);
  assert.equal((await prisma.checkout.findUnique({ where: { id: paypalCheckout.id } }))?.status, "PAID");
  assert.equal(await prisma.customerLibrary.count({ where: { userId: user.id, productId: product.id } }), 1);
});

test("late success cannot resurrect a failed checkout or grant access", async () => {
  const result = await prisma.$transaction((tx) => fulfillPaidCheckout(tx, { checkoutId: stripeFailedCheckout.id, provider: "STRIPE", providerRef: stripeSession }));
  assert.deepEqual(result, { ok: false, reason: "checkout_not_payable" });
  assert.equal((await prisma.checkout.findUnique({ where: { id: stripeFailedCheckout.id } }))?.status, "FAILED");
  assert.equal(await prisma.customerLibrary.count({ where: { userId: user.id, productId: product.id } }), 1);
});
