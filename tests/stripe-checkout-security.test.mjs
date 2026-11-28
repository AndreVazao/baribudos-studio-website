import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Stripe checkout rejects cross-origin requests before parsing JSON", async () => {
  const route = await readFile(new URL("../src/app/api/checkout/stripe/route.ts", import.meta.url), "utf8");
  const originGate = route.indexOf("isSameOriginPayPalCaptureRequest(request.headers.get(\"origin\"), request.url)");
  const parseBody = route.indexOf("body = await request.json()");
  assert.ok(originGate >= 0, "route must enforce same-origin");
  assert.ok(parseBody > originGate, "origin check must happen before JSON parsing");
  assert.ok(route.includes('status: 403'));
});

test("Stripe checkout marks provider failures and malformed sessions as failed orphan checkouts", async () => {
  const route = await readFile(new URL("../src/app/api/checkout/stripe/route.ts", import.meta.url), "utf8");
  assert.ok(route.includes("let createdCheckoutId: string | null = null"));
  assert.ok(route.includes("createdCheckoutId = checkout.id"));
  assert.ok(route.includes('where: { id: checkout.id, status: "PENDING", providerRef: null }'));
  assert.ok(route.includes('where: { id: createdCheckoutId, status: "PENDING", providerRef: null }'));
  assert.ok(route.includes('data: { status: "FAILED" }'));
  assert.ok(route.includes('parsedStripeCheckoutUrl.protocol === "https:"'));
  assert.ok(route.includes('parsedStripeCheckoutUrl.hostname === "checkout.stripe.com"'));
  assert.ok(route.includes("!stripeCheckoutUrlIsTrusted"));
});
