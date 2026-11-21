import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const [{ handlePayPalCaptureRequest }, { capturePayPalOrder }] = await Promise.all([
  importTypeScript("../src/lib/paypal-capture-handler.ts"),
  importTypeScript("../src/lib/paypal.ts"),
]);

function makeRequest() {
  return new Request("https://shop.example/api/checkout/paypal/capture-order", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://shop.example",
    },
    body: JSON.stringify({ orderId: "PAYPAL-ORDER-42" }),
  });
}

function makeCheckout() {
  return {
    id: "checkout-42",
    provider: "PAYPAL",
    status: "PENDING",
    userId: "customer-42",
    amountCents: 2590,
    currency: "EUR",
    captureCapabilityHash: null,
    captureCapabilityExpiresAt: null,
    captureCapabilityConsumedAt: null,
  };
}

function makeDependencies(overrides = {}) {
  return {
    isSameOrigin: () => true,
    findCheckout: async () => makeCheckout(),
    getCurrentUser: async () => ({ id: "customer-42" }),
    getCapability: async () => null,
    authorize: () => ({ ok: true, mode: "authenticated" }),
    capturePayPalOrder: async (orderId, requestId) => ({
      id: orderId,
      status: "COMPLETED",
      requestId,
    }),
    isValidCapture: () => true,
    fulfillPaidCheckout: async () => ({ ok: true }),
    successUrl: "https://shop.example/biblioteca",
    paymentErrorPayload: (code) => ({ error: code }),
    ...overrides,
  };
}

test("capture client sends the local checkout ID as PayPal-Request-Id", async (t) => {
  const envKeys = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_SECRET", "PAYPAL_MODE"];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;

  t.after(() => {
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
    globalThis.fetch = previousFetch;
  });

  process.env.PAYPAL_CLIENT_ID = "test-client";
  process.env.PAYPAL_CLIENT_SECRET = "test-secret";
  delete process.env.PAYPAL_SECRET;
  process.env.PAYPAL_MODE = "sandbox";

  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    requests.push({ url, init });

    if (url.endsWith("/v1/oauth2/token")) {
      return new Response(JSON.stringify({ access_token: "test-access-token" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith("/v2/checkout/orders/PAYPAL-ORDER-42/capture")) {
      return new Response(JSON.stringify({ id: "PAYPAL-ORDER-42", status: "COMPLETED" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error("Unexpected mocked PayPal URL");
  };

  const result = await capturePayPalOrder("PAYPAL-ORDER-42", "checkout-42");

  assert.equal(result.id, "PAYPAL-ORDER-42");
  const captureRequest = requests.find(({ url }) => url.endsWith("/capture"));
  assert.ok(captureRequest, "capture request must be sent");
  assert.equal(captureRequest.init.method, "POST");
  assert.equal(captureRequest.init.headers["PayPal-Request-Id"], "checkout-42");
  assert.equal(captureRequest.init.headers.Authorization, "Bearer test-access-token");
});

test("concurrent capture requests reuse the same provider idempotency key", async () => {
  const providerRequests = [];
  const providerCaptures = new Map();
  let entitlementGrants = 0;

  const dependencies = makeDependencies({
    capturePayPalOrder: async (orderId, requestId) => {
      providerRequests.push({ orderId, requestId });
      if (!providerCaptures.has(requestId)) {
        providerCaptures.set(requestId, {
          id: orderId,
          status: "COMPLETED",
        });
      }
      return providerCaptures.get(requestId);
    },
    fulfillPaidCheckout: async () => {
      if (entitlementGrants === 0) entitlementGrants += 1;
      return { ok: true };
    },
  });

  const [first, second] = await Promise.all([
    handlePayPalCaptureRequest(makeRequest(), dependencies),
    handlePayPalCaptureRequest(makeRequest(), dependencies),
  ]);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(providerRequests.length, 2);
  assert.deepEqual(providerRequests, [
    { orderId: "PAYPAL-ORDER-42", requestId: "checkout-42" },
    { orderId: "PAYPAL-ORDER-42", requestId: "checkout-42" },
  ]);
  assert.equal(providerCaptures.size, 1);
  assert.equal(entitlementGrants, 1);
});

test("retry after timeout following provider success reuses the same idempotency key", async () => {
  const providerRequests = [];
  let providerCapture = null;
  let firstAttempt = true;
  let entitlementGrants = 0;

  const dependencies = makeDependencies({
    capturePayPalOrder: async (orderId, requestId) => {
      providerRequests.push({ orderId, requestId });
      providerCapture ??= { id: orderId, status: "COMPLETED" };

      if (firstAttempt) {
        firstAttempt = false;
        throw new Error("simulated timeout after provider accepted capture");
      }

      return providerCapture;
    },
    fulfillPaidCheckout: async () => {
      entitlementGrants += 1;
      return { ok: true };
    },
  });

  const first = await handlePayPalCaptureRequest(makeRequest(), dependencies);
  const retry = await handlePayPalCaptureRequest(makeRequest(), dependencies);

  assert.equal(first.status, 500);
  assert.equal(retry.status, 200);
  assert.deepEqual(providerRequests, [
    { orderId: "PAYPAL-ORDER-42", requestId: "checkout-42" },
    { orderId: "PAYPAL-ORDER-42", requestId: "checkout-42" },
  ]);
  assert.equal(entitlementGrants, 1);
});
