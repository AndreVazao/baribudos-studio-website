import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const PAYPAL_CAPTURE_CAPABILITY_TTL_SECONDS = 15 * 60;
export const PAYPAL_CAPTURE_COOKIE_PATH = "/api/checkout/paypal/capture-order";

const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function hashPayPalCaptureCapability(token) {
  if (typeof token !== "string" || !token) {
    throw new TypeError("A capture capability token is required.");
  }

  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createPayPalCaptureCapability(now = new Date()) {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashPayPalCaptureCapability(token),
    expiresAt: new Date(now.getTime() + PAYPAL_CAPTURE_CAPABILITY_TTL_SECONDS * 1000),
  };
}

export function verifyPayPalCaptureCapability(token, storedHash) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return false;
  if (typeof storedHash !== "string" || !HASH_PATTERN.test(storedHash)) return false;

  const candidate = Buffer.from(hashPayPalCaptureCapability(token), "hex");
  const expected = Buffer.from(storedHash, "hex");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function getPayPalCaptureCookieName(orderId) {
  if (typeof orderId !== "string" || !orderId.trim() || orderId.length > 128) {
    throw new TypeError("A valid PayPal order ID is required.");
  }

  const suffix = createHash("sha256").update(orderId.trim(), "utf8").digest("hex").slice(0, 24);
  return `bb_pp_cap_${suffix}`;
}

export function isSameOriginPayPalCaptureRequest(origin, requestUrl) {
  if (typeof origin !== "string" || !origin || origin === "null") return false;

  try {
    const parsedOrigin = new URL(origin);
    const requestOrigin = new URL(requestUrl).origin;

    // Origin headers contain only an origin, not a path or credentials.
    return parsedOrigin.origin === origin && parsedOrigin.origin === requestOrigin;
  } catch {
    return false;
  }
}

export function authorizePayPalCapture({ checkout, currentUserId, capability, now = new Date() }) {
  if (checkout.captureCapabilityHash) {
    if (!verifyPayPalCaptureCapability(capability, checkout.captureCapabilityHash)) {
      return { ok: false, reason: "guest_capability_required" };
    }

    const expiresAt = checkout.captureCapabilityExpiresAt
      ? new Date(checkout.captureCapabilityExpiresAt)
      : null;

    if (!expiresAt || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      return { ok: false, reason: "guest_capability_expired" };
    }

    // A consumed capability may only be replayed to read the already-paid result.
    // It can never authorize another provider capture or a new entitlement.
    if (checkout.status !== "PAID" && checkout.captureCapabilityConsumedAt) {
      return { ok: false, reason: "guest_capability_consumed" };
    }

    return {
      ok: true,
      mode: "guest",
      capabilityHash: hashPayPalCaptureCapability(capability),
      authorizedAt: new Date(now.getTime()),
    };
  }

  if (!currentUserId) return { ok: false, reason: "authentication_required" };
  if (currentUserId !== checkout.userId) return { ok: false, reason: "checkout_owner_mismatch" };

  return { ok: true, mode: "authenticated" };
}
