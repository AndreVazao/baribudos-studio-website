import { randomUUID } from "node:crypto";

export const PAYPAL_CAPTURE_LEASE_TTL_MS = 3 * 60 * 1000;

export type PayPalCaptureCheckout = {
  id: string;
  provider: string;
  status: string;
  userId: string;
  amountCents: number;
  currency: string;
  captureCapabilityHash: string | null;
  captureCapabilityExpiresAt: Date | null;
  captureCapabilityConsumedAt: Date | null;
  captureLeaseId?: string | null;
  captureLeaseExpiresAt?: Date | null;
};

export type PayPalCaptureAuthorization =
  | { ok: true; mode: "authenticated" }
  | {
      ok: true;
      mode: "guest";
      capabilityHash: string;
      authorizedAt: Date;
    }
  | { ok: false; reason: string };

export type PayPalCaptureFulfillmentInput = {
  checkoutId: string;
  provider: "PAYPAL";
  providerRef: string;
  captureCapabilityHash?: string;
  captureCapabilityAuthorizedAt?: Date;
  captureLeaseId?: string;
};

export type PayPalCaptureHandlerDependencies = {
  isSameOrigin: (origin: string | null, requestUrl: string) => boolean;
  findCheckout: (orderId: string) => Promise<PayPalCaptureCheckout | null>;
  getCurrentUser: () => Promise<{ id?: string } | null>;
  getCapability: (orderId: string) => Promise<string | null>;
  authorize: (input: {
    checkout: PayPalCaptureCheckout;
    currentUserId: string | null;
    capability: string | null;
  }) => PayPalCaptureAuthorization;
  acquireCaptureLease: (input: { checkoutId: string; orderId: string; leaseId: string; expiresAt: Date }) => Promise<boolean>;
  releaseCaptureLease: (input: { checkoutId: string; leaseId: string }) => Promise<void>;
  getPayPalOrder: (orderId: string) => Promise<unknown>;
  capturePayPalOrder: (orderId: string, checkoutId: string) => Promise<unknown>;
  isValidCapture: (
    capture: unknown,
    expected: {
      orderId: string;
      checkoutId: string;
      amountCents: number;
      currency: string;
    },
  ) => boolean;
  fulfillPaidCheckout: (
    input: PayPalCaptureFulfillmentInput,
  ) => Promise<{ ok: boolean; reason?: string }>;
  successUrl: string;
  paymentErrorPayload: (code: string) => unknown;
};

export type PayPalCaptureHandlerResult = {
  status: number;
  body: unknown;
  clearGuestCapabilityCookie?: boolean;
  orderId?: string;
};


// Process-local single-flight guard: concurrent requests in the same server
// instance share one provider capture promise. PayPal-Request-Id remains the
// cross-instance idempotency mechanism; this map is intentionally not presented
// as a distributed lock.
const activeCaptures = new Map<string, Promise<unknown>>();

async function capturePayPalOrderSingleFlight(
  orderId: string,
  checkoutId: string,
  capturePayPalOrder: (orderId: string, checkoutId: string) => Promise<unknown>,
): Promise<unknown> {
  const existing = activeCaptures.get(orderId);
  if (existing) return existing;

  const capturePromise = capturePayPalOrder(orderId, checkoutId);
  activeCaptures.set(orderId, capturePromise);
  try {
    return await capturePromise;
  } finally {
    if (activeCaptures.get(orderId) === capturePromise) {
      activeCaptures.delete(orderId);
    }
  }
}

function failure(status: number, error: string): PayPalCaptureHandlerResult {
  return { status, body: { error } };
}

function success(
  successUrl: string,
  orderId: string,
  guestCapture: boolean,
): PayPalCaptureHandlerResult {
  return {
    status: 200,
    body: { ok: true, successUrl },
    ...(guestCapture ? { clearGuestCapabilityCookie: true, orderId } : {}),
  };
}

/**
 * Framework-independent capture handler used by the Next.js route and handler
 * tests. All identity, persistence and provider operations are injected so the
 * authorization gates can be exercised without a live provider or database.
 */
export async function handlePayPalCaptureRequest(
  request: Request,
  dependencies: PayPalCaptureHandlerDependencies,
): Promise<PayPalCaptureHandlerResult> {
  if (!dependencies.isSameOrigin(request.headers.get("origin"), request.url)) {
    return failure(403, "capture_origin_invalid");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure(400, "JSON inválido.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return failure(400, "Pedido inválido.");
  }

  const input = body as { orderId?: unknown };
  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";

  if (!orderId || orderId.length > 128) {
    return failure(400, "orderId inválido.");
  }

  try {
    // The provider order ID is only a local lookup reference, never a capability.
    const checkout = await dependencies.findCheckout(orderId);

    if (!checkout || checkout.provider !== "PAYPAL") {
      return failure(404, "Checkout não encontrado.");
    }

    const currentUser = await dependencies.getCurrentUser();
    const capability = await dependencies.getCapability(orderId);
    const authorization = dependencies.authorize({
      checkout,
      currentUserId: currentUser?.id ?? null,
      capability,
    });

    if (!authorization.ok) {
      const status = authorization.reason === "authentication_required"
        || authorization.reason === "guest_capability_required"
        ? 401
        : 403;
      return failure(status, "capture_not_authorized");
    }

    if (checkout.status === "PAID") {
      return success(
        dependencies.successUrl,
        orderId,
        authorization.mode === "guest",
      );
    }

    if (checkout.status !== "PENDING") {
      return failure(409, "Checkout não está disponível para pagamento.");
    }

    // A database lease coordinates server instances. The provider's stable
    // PayPal-Request-Id remains the recovery/idempotency backstop after expiry.
    const leaseId = randomUUID();
    const leaseExpiresAt = new Date(Date.now() + PAYPAL_CAPTURE_LEASE_TTL_MS);
    const leaseAcquired = await dependencies.acquireCaptureLease({
      checkoutId: checkout.id,
      orderId,
      leaseId,
      expiresAt: leaseExpiresAt,
    });
    if (!leaseAcquired) {
      return failure(409, "capture_in_progress");
    }

    try {
      // A previous capture request may have succeeded at PayPal while its HTTP
      // response was lost. Read the provider's durable order state first.
      const providerOrder = await dependencies.getPayPalOrder(orderId);
      const providerStatus = providerOrder && typeof providerOrder === "object"
        ? (providerOrder as { status?: unknown }).status
        : undefined;

      let capture: unknown;
      if (providerStatus === "COMPLETED") {
        capture = providerOrder;
      } else if (providerStatus === "APPROVED") {
        capture = await capturePayPalOrderSingleFlight(orderId, checkout.id, dependencies.capturePayPalOrder);
      } else {
        return failure(409, "O pedido PayPal ainda não está aprovado para captura.");
      }

      if (!dependencies.isValidCapture(capture, {
        orderId,
        checkoutId: checkout.id,
        amountCents: checkout.amountCents,
        currency: checkout.currency,
      })) {
        return failure(409, "O pagamento PayPal não corresponde ao checkout esperado.");
      }

      // Lease ownership is checked in the same transaction as PAID and grants.
      const fulfillment = await dependencies.fulfillPaidCheckout({
        checkoutId: checkout.id,
        provider: "PAYPAL",
        providerRef: orderId,
        captureLeaseId: leaseId,
        ...(authorization.mode === "guest"
          ? {
              captureCapabilityHash: authorization.capabilityHash,
              captureCapabilityAuthorizedAt: authorization.authorizedAt,
            }
          : {}),
      });

      if (!fulfillment.ok) {
        return failure(409, fulfillment.reason || "payment_fulfillment_conflict");
      }

      return success(
        dependencies.successUrl,
        orderId,
        authorization.mode === "guest",
      );
    } finally {
      try {
        await dependencies.releaseCaptureLease({ checkoutId: checkout.id, leaseId });
      } catch {
        // A stale lease expires automatically; release failure must not mask a
        // completed provider capture or local fulfillment result.
      }
    }
  } catch {
    return {
      status: 500,
      body: dependencies.paymentErrorPayload("payment_capture_failed"),
    };
  }
}
