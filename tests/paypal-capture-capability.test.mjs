import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  authorizePayPalCapture,
  createPayPalCaptureCapability,
  getPayPalCaptureCookieName,
  hashPayPalCaptureCapability,
  isSameOriginPayPalCaptureRequest,
  verifyPayPalCaptureCapability,
} from "../src/lib/paypal-capture-capability.mjs";
import { getExpiredPayPalCaptureCookieOptions, getPayPalCaptureCookieOptions } from "../src/lib/paypal-capture-cookie.mjs";

const now = new Date("2026-11-20T10:00:00.000Z");

function checkout(overrides = {}) {
  return {
    userId: "checkout-owner",
    status: "PENDING",
    captureCapabilityHash: null,
    captureCapabilityExpiresAt: null,
    captureCapabilityConsumedAt: null,
    ...overrides,
  };
}

test("guest capability is random, high entropy and stored only as a SHA-256 hash", () => {
  const first = createPayPalCaptureCapability(now);
  const second = createPayPalCaptureCapability(now);

  assert.match(first.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(first.token, "base64url").length, 32);
  assert.equal(first.tokenHash, hashPayPalCaptureCapability(first.token));
  assert.notEqual(first.token, first.tokenHash);
  assert.notEqual(first.tokenHash, second.tokenHash);
  assert.equal(first.expiresAt.toISOString(), "2026-11-20T10:15:00.000Z");
});

test("capability comparison accepts only the matching token and uses a fixed hash shape", () => {
  const issued = createPayPalCaptureCapability(now);

  assert.equal(verifyPayPalCaptureCapability(issued.token, issued.tokenHash), true);
  assert.equal(verifyPayPalCaptureCapability("wrong-token", issued.tokenHash), false);
  assert.equal(verifyPayPalCaptureCapability(issued.token, "not-a-hash"), false);
  assert.equal(verifyPayPalCaptureCapability(null, issued.tokenHash), false);
});

test("guest checkout requires its own unexpired capability", () => {
  const issued = createPayPalCaptureCapability(now);
  const value = checkout({
    captureCapabilityHash: issued.tokenHash,
    captureCapabilityExpiresAt: issued.expiresAt,
  });

  const authorized = authorizePayPalCapture({
    checkout: value,
    currentUserId: null,
    capability: issued.token,
    now,
  });

  assert.deepEqual(authorized, {
    ok: true,
    mode: "guest",
    capabilityHash: issued.tokenHash,
    authorizedAt: now,
  });
  assert.equal(authorizePayPalCapture({ checkout: value, currentUserId: null, capability: null, now }).ok, false);
  assert.equal(authorizePayPalCapture({ checkout: value, currentUserId: null, capability: "wrong", now }).ok, false);
});

test("expired or consumed pending guest capabilities are denied", () => {
  const issued = createPayPalCaptureCapability(now);
  const base = {
    captureCapabilityHash: issued.tokenHash,
    captureCapabilityExpiresAt: issued.expiresAt,
  };

  assert.deepEqual(
    authorizePayPalCapture({
      checkout: checkout({ ...base, captureCapabilityExpiresAt: new Date(now.getTime() - 1) }),
      currentUserId: null,
      capability: issued.token,
      now,
    }),
    { ok: false, reason: "guest_capability_expired" }
  );

  assert.deepEqual(
    authorizePayPalCapture({
      checkout: checkout({ ...base, captureCapabilityConsumedAt: now }),
      currentUserId: null,
      capability: issued.token,
      now,
    }),
    { ok: false, reason: "guest_capability_consumed" }
  );
});

test("a consumed capability can only replay an already-paid result", () => {
  const issued = createPayPalCaptureCapability(now);
  const paid = checkout({
    status: "PAID",
    captureCapabilityHash: issued.tokenHash,
    captureCapabilityExpiresAt: issued.expiresAt,
    captureCapabilityConsumedAt: now,
  });

  assert.equal(
    authorizePayPalCapture({ checkout: paid, currentUserId: null, capability: issued.token, now }).ok,
    true
  );
  assert.equal(
    authorizePayPalCapture({
      checkout: checkout({ ...paid, status: "PENDING" }),
      currentUserId: null,
      capability: issued.token,
      now,
    }).ok,
    false
  );
});

test("authenticated capture is bound to the active session owner", () => {
  const value = checkout();

  assert.deepEqual(
    authorizePayPalCapture({ checkout: value, currentUserId: "checkout-owner", capability: null, now }),
    { ok: true, mode: "authenticated" }
  );
  assert.deepEqual(
    authorizePayPalCapture({ checkout: value, currentUserId: "another-user", capability: null, now }),
    { ok: false, reason: "checkout_owner_mismatch" }
  );
  assert.deepEqual(
    authorizePayPalCapture({ checkout: value, currentUserId: null, capability: null, now }),
    { ok: false, reason: "authentication_required" }
  );
});

test("capture cookie names are checkout-specific without containing the provider order ID", () => {
  const first = getPayPalCaptureCookieName("ORDER-ONE");
  const second = getPayPalCaptureCookieName("ORDER-TWO");

  assert.match(first, /^bb_pp_cap_[a-f0-9]{24}$/);
  assert.notEqual(first, second);
  assert.equal(first.includes("ORDER-ONE"), false);
});

test("capture POST accepts only an exact same-origin Origin header", () => {
  assert.equal(isSameOriginPayPalCaptureRequest("https://shop.example", "https://shop.example/api/capture"), true);
  assert.equal(isSameOriginPayPalCaptureRequest("https://evil.example", "https://shop.example/api/capture"), false);
  assert.equal(isSameOriginPayPalCaptureRequest("https://shop.example/path", "https://shop.example/api/capture"), false);
  assert.equal(isSameOriginPayPalCaptureRequest(null, "https://shop.example/api/capture"), false);
  assert.equal(isSameOriginPayPalCaptureRequest("null", "https://shop.example/api/capture"), false);
});

test("PayPal routes enforce the owner-or-capability contract and never return the raw capability", async () => {
  const createRoute = await readFile(new URL("../src/app/api/checkout/paypal/create-order/route.ts", import.meta.url), "utf8");
  const captureRoute = await readFile(new URL("../src/app/api/checkout/paypal/capture-order/route.ts", import.meta.url), "utf8");
  const captureHandler = await readFile(new URL("../src/lib/paypal-capture-handler.ts", import.meta.url), "utf8");

  const createOriginGate = createRoute.indexOf("isSameOriginPayPalCaptureRequest(request.headers.get(\"origin\"), request.url)");
  const bodyParse = createRoute.indexOf("body = await request.json()");
  assert.ok(createOriginGate >= 0, "checkout creation must enforce a same-origin gate");
  assert.ok(createOriginGate < bodyParse, "Origin must be checked before parsing or acting on checkout input");
  assert.ok(createRoute.includes('status: 403'));

  assert.ok(createRoute.includes("captureCapabilityHash: guestCapability.tokenHash"));
  assert.ok(createRoute.includes("getPayPalCaptureCookieOptions("));
  assert.deepEqual(getPayPalCaptureCookieOptions(true), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/checkout/paypal/capture-order",
    maxAge: 15 * 60,
  });
  assert.equal(createRoute.includes("token: guestCapability.token"), false);

  assert.ok(captureRoute.includes("handlePayPalCaptureRequest("));
  assert.ok(captureRoute.includes("getCurrentUser"));
  assert.ok(captureRoute.includes("authorizePayPalCapture"));
  assert.ok(captureRoute.includes("cookieStore.get(getPayPalCaptureCookieName(orderId))"));
  assert.ok(captureHandler.includes("dependencies.isSameOrigin("));
  assert.ok(captureHandler.includes("dependencies.authorize("));
  assert.ok(captureHandler.includes("capturePayPalOrderSingleFlight(orderId, checkout.id, dependencies.capturePayPalOrder)"));
  assert.ok(captureRoute.includes("getExpiredPayPalCaptureCookieOptions("));
  assert.deepEqual(getExpiredPayPalCaptureCookieOptions(true), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/checkout/paypal/capture-order",
    maxAge: 0,
    expires: new Date(0),
  });
  assert.equal(captureRoute.includes("capability?: unknown"), false);
});

test("capture handler places Origin, checkout and authorization gates before external capture", async () => {
  const handler = await readFile(new URL("../src/lib/paypal-capture-handler.ts", import.meta.url), "utf8");
  const originGate = handler.indexOf("if (!dependencies.isSameOrigin(");
  const checkoutLookup = handler.indexOf("dependencies.findCheckout(orderId)");
  const authorization = handler.indexOf("dependencies.authorize({");
  const authorizationDenial = handler.indexOf("if (!authorization.ok)");
  const paidReplay = handler.indexOf('if (checkout.status === "PAID")');
  const pendingGate = handler.indexOf('if (checkout.status !== "PENDING")');
  const providerStateLookup = handler.indexOf("dependencies.getPayPalOrder(orderId)");
  const externalCapture = handler.indexOf("capturePayPalOrderSingleFlight(orderId, checkout.id, dependencies.capturePayPalOrder)");
  const captureValidation = handler.indexOf("dependencies.isValidCapture(capture,");
  const fulfillment = handler.indexOf("dependencies.fulfillPaidCheckout({");

  assert.ok(originGate >= 0, "same-origin gate must exist");
  assert.ok(checkoutLookup > originGate, "Origin must be checked before checkout lookup");
  assert.ok(authorization > checkoutLookup, "checkout authorization must follow local checkout lookup");
  assert.ok(authorizationDenial > authorization, "authorization denial must follow authorization result");
  assert.ok(paidReplay > authorizationDenial, "paid replay must only be evaluated after authorization denial handling");
  assert.ok(pendingGate > paidReplay, "pending-state gate must precede provider capture");
  assert.ok(providerStateLookup > pendingGate, "provider state must be read after the route gates");
  assert.ok(externalCapture > providerStateLookup, "provider capture must follow provider state lookup");
  assert.ok(captureValidation > externalCapture, "capture validation must follow provider capture");
  assert.ok(fulfillment > captureValidation, "local fulfillment must follow provider response validation");
});
