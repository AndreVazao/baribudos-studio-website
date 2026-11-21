import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/paypal-capture-handler.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { handlePayPalCaptureRequest } = await import(moduleUrl);

const defaultCheckout = () => ({
  id: "checkout-1",
  provider: "PAYPAL",
  status: "PENDING",
  userId: "checkout-owner",
  amountCents: 1290,
  currency: "EUR",
});

function makeRequest(body, origin = "https://shop.example") {
  const headers = { "content-type": "application/json" };
  if (origin !== null) headers.origin = origin;
  return new Request("https://shop.example/api/checkout/paypal/capture-order", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeDependencies(overrides = {}) {
  const calls = [];
  const dependencies = {
    isSameOrigin: () => true,
    findCheckout: async (orderId) => {
      calls.push(["findCheckout", orderId]);
      return defaultCheckout();
    },
    getCurrentUser: async () => ({ id: "checkout-owner" }),
    getCapability: async () => null,
    authorize: () => ({ ok: true, mode: "authenticated" }),
    getPayPalOrder: async (orderId) => {
      calls.push(["getPayPalOrder", orderId]);
      return { id: orderId, status: "APPROVED" };
    },
    capturePayPalOrder: async (orderId, checkoutId) => {
      calls.push(["capturePayPalOrder", orderId, checkoutId]);
      return { id: orderId, status: "COMPLETED" };
    },
    isValidCapture: () => true,
    fulfillPaidCheckout: async (input) => {
      calls.push(["fulfillPaidCheckout", input]);
      return { ok: true };
    },
    successUrl: "https://shop.example/biblioteca",
    paymentErrorPayload: (code) => ({ error: code }),
    ...overrides,
  };

  return { dependencies, calls };
}

test("same-origin denial happens before checkout lookup or provider access", async () => {
  const { dependencies, calls } = makeDependencies({
    isSameOrigin: () => false,
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 403);
  assert.deepEqual(result.body, { error: "capture_origin_invalid" });
  assert.deepEqual(calls, []);
});

test("invalid JSON and non-object bodies are rejected before database access", async () => {
  const first = makeDependencies();
  const invalidJson = await handlePayPalCaptureRequest(makeRequest("{invalid-json"), first.dependencies);
  assert.equal(invalidJson.status, 400);
  assert.deepEqual(first.calls, []);

  const second = makeDependencies();
  const arrayBody = await handlePayPalCaptureRequest(makeRequest([]), second.dependencies);
  assert.equal(arrayBody.status, 400);
  assert.deepEqual(second.calls, []);
});

test("missing, oversized and non-string order IDs are rejected before checkout lookup", async () => {
  for (const body of [{}, { orderId: "x".repeat(129) }, { orderId: 42 }]) {
    const { dependencies, calls } = makeDependencies();
    const result = await handlePayPalCaptureRequest(makeRequest(body), dependencies);
    assert.equal(result.status, 400);
    assert.deepEqual(calls, []);
  }
});

test("missing or non-PayPal local checkout is rejected before provider capture", async () => {
  const missing = makeDependencies({ findCheckout: async () => null });
  const missingResult = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), missing.dependencies);
  assert.equal(missingResult.status, 404);
  assert.equal(missing.calls.some(([name]) => name === "capturePayPalOrder"), false);

  const wrongProvider = makeDependencies({
    findCheckout: async () => ({ ...defaultCheckout(), provider: "STRIPE" }),
  });
  const providerResult = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), wrongProvider.dependencies);
  assert.equal(providerResult.status, 404);
  assert.equal(wrongProvider.calls.some(([name]) => name === "capturePayPalOrder"), false);
});

test("authentication-required and wrong-owner decisions never reach PayPal", async () => {
  const anonymous = makeDependencies({
    getCurrentUser: async () => null,
    authorize: () => ({ ok: false, reason: "authentication_required" }),
  });
  const anonymousResult = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), anonymous.dependencies);
  assert.equal(anonymousResult.status, 401);
  assert.equal(anonymous.calls.some(([name]) => name === "capturePayPalOrder"), false);

  const wrongOwner = makeDependencies({
    getCurrentUser: async () => ({ id: "another-user" }),
    authorize: () => ({ ok: false, reason: "checkout_owner_mismatch" }),
  });
  const ownerResult = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), wrongOwner.dependencies);
  assert.equal(ownerResult.status, 403);
  assert.equal(wrongOwner.calls.some(([name]) => name === "capturePayPalOrder"), false);
});

test("missing guest capability returns 401 before provider capture", async () => {
  const { dependencies, calls } = makeDependencies({
    getCurrentUser: async () => null,
    authorize: () => ({ ok: false, reason: "guest_capability_required" }),
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: "capture_not_authorized" });
  assert.equal(calls.some(([name]) => name === "capturePayPalOrder"), false);
});

test("an authorized already-paid guest replay returns success without another provider call", async () => {
  const { dependencies, calls } = makeDependencies({
    findCheckout: async () => ({ ...defaultCheckout(), status: "PAID" }),
    getCurrentUser: async () => null,
    authorize: () => ({
      ok: true,
      mode: "guest",
      capabilityHash: "a".repeat(64),
      authorizedAt: new Date("2026-11-20T10:00:00.000Z"),
    }),
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 200);
  assert.equal(result.clearGuestCapabilityCookie, true);
  assert.equal(result.orderId, "ORDER-1");
  assert.equal(calls.some(([name]) => name === "capturePayPalOrder"), false);
  assert.equal(calls.some(([name]) => name === "fulfillPaidCheckout"), false);
});

test("non-pending checkout is rejected before provider capture", async () => {
  const { dependencies, calls } = makeDependencies({
    findCheckout: async () => ({ ...defaultCheckout(), status: "FAILED" }),
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 409);
  assert.equal(calls.some(([name]) => name === "capturePayPalOrder"), false);
});

test("authenticated owner path captures and fulfills the matching local checkout", async () => {
  const { dependencies, calls } = makeDependencies();

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    successUrl: "https://shop.example/biblioteca",
  });
  assert.equal(result.clearGuestCapabilityCookie, undefined);
  assert.deepEqual(calls.filter(([name]) => name === "capturePayPalOrder"), [
    ["capturePayPalOrder", "ORDER-1", "checkout-1"],
  ]);
  assert.deepEqual(calls.filter(([name]) => name === "fulfillPaidCheckout"), [
    ["fulfillPaidCheckout", {
      checkoutId: "checkout-1",
      provider: "PAYPAL",
      providerRef: "ORDER-1",
    }],
  ]);
});

test("guest path passes the verified capability context into atomic fulfillment", async () => {
  const authorizedAt = new Date("2026-11-20T10:00:00.000Z");
  const { dependencies, calls } = makeDependencies({
    getCurrentUser: async () => null,
    getCapability: async () => "opaque-guest-capability",
    authorize: () => ({
      ok: true,
      mode: "guest",
      capabilityHash: "b".repeat(64),
      authorizedAt,
    }),
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 200);
  assert.equal(result.clearGuestCapabilityCookie, true);
  assert.equal(result.orderId, "ORDER-1");
  assert.deepEqual(calls.filter(([name]) => name === "fulfillPaidCheckout"), [
    ["fulfillPaidCheckout", {
      checkoutId: "checkout-1",
      provider: "PAYPAL",
      providerRef: "ORDER-1",
      captureCapabilityHash: "b".repeat(64),
      captureCapabilityAuthorizedAt: authorizedAt,
    }],
  ]);
});

test("completed provider order is reconciled without a second capture request", async () => {
  const { dependencies, calls } = makeDependencies({
    getPayPalOrder: async (orderId) => ({
      id: orderId,
      status: "COMPLETED",
      purchase_units: [{
        custom_id: "checkout-1",
        payments: {
          captures: [{
            status: "COMPLETED",
            amount: { currency_code: "EUR", value: "12.90" },
          }],
        },
      }],
    }),
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 200);
  assert.equal(calls.some(([name]) => name === "capturePayPalOrder"), false);
  assert.equal(calls.some(([name]) => name === "fulfillPaidCheckout"), true);
});

test("provider order that is not approved or completed is never captured", async () => {
  const { dependencies, calls } = makeDependencies({
    getPayPalOrder: async () => ({ id: "ORDER-1", status: "CREATED" }),
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 409);
  assert.equal(calls.some(([name]) => name === "capturePayPalOrder"), false);
  assert.equal(calls.some(([name]) => name === "fulfillPaidCheckout"), false);
});

test("invalid provider capture never grants a library entitlement", async () => {
  const { dependencies, calls } = makeDependencies({
    isValidCapture: () => false,
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 409);
  assert.equal(calls.some(([name]) => name === "fulfillPaidCheckout"), false);
});

test("provider exceptions are sanitized and do not reach fulfillment", async () => {
  const { dependencies, calls } = makeDependencies({
    capturePayPalOrder: async () => {
      throw new Error("provider-secret-or-stack-must-not-leak");
    },
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 500);
  assert.deepEqual(result.body, { error: "payment_capture_failed" });
  assert.equal(JSON.stringify(result.body).includes("provider-secret"), false);
  assert.equal(calls.some(([name]) => name === "fulfillPaidCheckout"), false);
});

test("fulfillment conflicts do not return a successful capture response", async () => {
  const { dependencies } = makeDependencies({
    fulfillPaidCheckout: async () => ({ ok: false, reason: "checkout_not_pending" }),
  });

  const result = await handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-1" }), dependencies);

  assert.equal(result.status, 409);
  assert.deepEqual(result.body, { error: "checkout_not_pending" });
});

test("concurrent same-instance requests share one PayPal capture call", async () => {
  let captureCalls = 0;
  let releaseCapture;
  const captureGate = new Promise((resolve) => { releaseCapture = resolve; });
  const { dependencies, calls } = makeDependencies({
    getPayPalOrder: async (orderId) => ({ id: orderId, status: "APPROVED" }),
    capturePayPalOrder: async (orderId, checkoutId) => {
      captureCalls += 1;
      calls.push(["capturePayPalOrder", orderId, checkoutId]);
      await captureGate;
      return { id: orderId, status: "COMPLETED" };
    },
  });

  const first = handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-CONCURRENT" }), dependencies);
  const second = handlePayPalCaptureRequest(makeRequest({ orderId: "ORDER-CONCURRENT" }), dependencies);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(captureCalls, 1);
  releaseCapture();
  const results = await Promise.all([first, second]);
  assert.deepEqual(results.map((result) => result.status), [200, 200]);
  assert.equal(captureCalls, 1);
  assert.equal(calls.filter(([name]) => name === "fulfillPaidCheckout").length, 2);
});
