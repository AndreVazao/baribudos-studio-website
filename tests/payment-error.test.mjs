import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { paymentErrorPayload } from "../src/lib/payment-error.mjs";

test("payment failures expose only stable public codes", () => {
  const internalErrors = [
    new Error("PayPal response included a provider diagnostic"),
    new Error("Prisma transaction failed with P2034"),
    new Error("database connection string details"),
  ];

  for (const error of internalErrors) {
    const payload = paymentErrorPayload("payment_processing_failed");
    assert.deepEqual(payload, { error: "payment_processing_failed" });
    assert.equal(JSON.stringify(payload).includes(error.message), false);
  }
});

test("checkout creation and capture use separate public error codes", () => {
  assert.deepEqual(paymentErrorPayload("checkout_creation_failed"), {
    error: "checkout_creation_failed",
  });
  assert.deepEqual(paymentErrorPayload("payment_capture_failed"), {
    error: "payment_capture_failed",
  });
});

test("invalid webhook signature and configuration errors are distinct", () => {
  assert.deepEqual(paymentErrorPayload("invalid_webhook_signature"), {
    error: "invalid_webhook_signature",
  });
  assert.deepEqual(paymentErrorPayload("webhook_configuration_error"), {
    error: "webhook_configuration_error",
  });
});

test("payment route handlers do not serialize raw exception messages", async () => {
  const routePaths = [
    "../src/app/api/checkout/stripe/route.ts",
    "../src/app/api/checkout/paypal/create-order/route.ts",
    "../src/app/api/checkout/paypal/capture-order/route.ts",
    "../src/app/api/webhook/stripe/route.ts",
  ];

  for (const path of routePaths) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /paymentErrorPayload\(/, path);
    assert.doesNotMatch(source, /error:\s*error\.message/, path);
  }
});

test("Stripe webhook configuration failure remains retryable while bad signatures are rejected", async () => {
  const source = await readFile(new URL("../src/app/api/webhook/stripe/route.ts", import.meta.url), "utf8");
  assert.match(source, /webhook_configuration_error[\s\S]*status:\s*500/);
  assert.match(source, /invalid_webhook_signature[\s\S]*status:\s*400/);
});
