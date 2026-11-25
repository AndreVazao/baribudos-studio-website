import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getExpiredPayPalCaptureCookieOptions,
  getPayPalCaptureCookieOptions,
} from "../src/lib/paypal-capture-cookie.mjs";
import {
  PAYPAL_CAPTURE_CAPABILITY_TTL_SECONDS,
  PAYPAL_CAPTURE_COOKIE_PATH,
} from "../src/lib/paypal-capture-capability.mjs";

test("guest capture cookie is HttpOnly, narrowly scoped and expires with its capability", () => {
  const options = getPayPalCaptureCookieOptions(false);

  assert.deepEqual(options, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: PAYPAL_CAPTURE_COOKIE_PATH,
    maxAge: PAYPAL_CAPTURE_CAPABILITY_TTL_SECONDS,
  });
  assert.equal(options.path, "/api/checkout/paypal/capture-order");
  assert.equal(options.httpOnly, true);
  assert.equal(options.maxAge, 900);
});

test("production capture cookie is Secure without changing its scope or lifetime", () => {
  const options = getPayPalCaptureCookieOptions(true);

  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, PAYPAL_CAPTURE_COOKIE_PATH);
  assert.equal(options.maxAge, PAYPAL_CAPTURE_CAPABILITY_TTL_SECONDS);
});

test("expired capability cookie preserves security attributes and expires immediately", () => {
  const options = getExpiredPayPalCaptureCookieOptions(true);

  assert.deepEqual(options, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: PAYPAL_CAPTURE_COOKIE_PATH,
    maxAge: 0,
    expires: new Date(0),
  });
});

test("Next.js create and capture adapters use the shared cookie policy", async () => {
  const createRoute = await readFile(
    new URL("../src/app/api/checkout/paypal/create-order/route.ts", import.meta.url),
    "utf8",
  );
  const captureRoute = await readFile(
    new URL("../src/app/api/checkout/paypal/capture-order/route.ts", import.meta.url),
    "utf8",
  );

  assert.ok(createRoute.includes("getPayPalCaptureCookieOptions"));
  assert.ok(createRoute.includes("response.cookies.set("));
  assert.ok(createRoute.includes("getPayPalCaptureCookieName(orderId)"));
  assert.ok(captureRoute.includes("getExpiredPayPalCaptureCookieOptions"));
  assert.ok(captureRoute.includes("response.cookies.set("));
  assert.ok(captureRoute.includes("getPayPalCaptureCookieName(result.orderId)"));
  assert.equal(createRoute.includes("httpOnly: true"), false);
  assert.equal(captureRoute.includes("maxAge: 0"), false);
});
