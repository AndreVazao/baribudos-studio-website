import { Prisma } from "@prisma/client";

export function isValidPayPalCapture(capture: unknown, expected: { orderId: string; checkoutId: string; amountCents: number; currency: string }): boolean {
  if (!capture || typeof capture !== "object") return false;
  const value = capture as { id?: unknown; status?: unknown; purchase_units?: Array<{ custom_id?: unknown; payments?: { captures?: Array<{ status?: unknown; amount?: { currency_code?: unknown; value?: unknown } }> } }> };
  if (value.id !== expected.orderId || value.status !== "COMPLETED") return false;
  const unit = value.purchase_units?.find((item) => item.custom_id === expected.checkoutId);
  const completed = unit?.payments?.captures?.find((item) => item.status === "COMPLETED");
  return Boolean(completed?.amount && completed.amount.value === (expected.amountCents / 100).toFixed(2) && String(completed.amount.currency_code || "").toUpperCase() === expected.currency.toUpperCase());
}

export function isValidStripePaidSession(session: { id?: unknown; mode?: unknown; payment_status?: unknown; amount_total?: unknown; currency?: unknown; metadata?: Record<string, unknown> | null }, checkout: { id: string; providerRef: string | null; provider: string; amountCents: number; currency: string }): boolean {
  return Boolean(checkout.provider === "STRIPE" && checkout.providerRef === session.id && session.metadata?.checkoutId === checkout.id && session.mode === "payment" && session.payment_status === "paid" && session.amount_total === checkout.amountCents && String(session.currency || "").toUpperCase() === checkout.currency.toUpperCase());
}

export async function fulfillPaidCheckout(tx: Prisma.TransactionClient, args: { checkoutId: string; provider: "PAYPAL" | "STRIPE"; providerRef: string; captureCapabilityHash?: string; captureCapabilityAuthorizedAt?: Date; captureLeaseId?: string }): Promise<{ ok: true; alreadyPaid: boolean } | { ok: false; reason: string }> {
  const checkout = await tx.checkout.findUnique({ where: { id: args.checkoutId }, include: { items: true } });
  if (!checkout || checkout.provider !== args.provider || checkout.providerRef !== args.providerRef) {
    return { ok: false, reason: "checkout_provider_reference_mismatch" };
  }

  const isGuestCapabilityCheckout = Boolean(checkout.captureCapabilityHash);
  const authorizedAt = args.captureCapabilityAuthorizedAt;

  if (isGuestCapabilityCheckout) {
    if (
      !args.captureCapabilityHash
      || args.captureCapabilityHash !== checkout.captureCapabilityHash
      || !authorizedAt
      || !Number.isFinite(authorizedAt.getTime())
      || !checkout.captureCapabilityExpiresAt
      || checkout.captureCapabilityExpiresAt <= authorizedAt
    ) {
      return { ok: false, reason: "capture_capability_invalid" };
    }
  } else if (args.captureCapabilityHash || authorizedAt) {
    return { ok: false, reason: "unexpected_capture_capability" };
  }

  if (args.captureLeaseId && checkout.captureLeaseId !== args.captureLeaseId) {
    return { ok: false, reason: "capture_lease_lost" };
  }

  if (checkout.status === "PAID") {
    return { ok: true, alreadyPaid: true };
  }

  if (checkout.status !== "PENDING") {
    return { ok: false, reason: "checkout_not_payable" };
  }

  if (isGuestCapabilityCheckout && checkout.captureCapabilityConsumedAt) {
    return { ok: false, reason: "capture_capability_invalid" };
  }

  // The conditional update is the one-time gate: status, capability hash,
  // expiry and consumption are checked and changed in a single SQL statement.
  const consumedAt = new Date();
  const transition = await tx.checkout.updateMany({
    where: {
      id: checkout.id,
      provider: args.provider,
      providerRef: args.providerRef,
      status: "PENDING",
      ...(args.captureLeaseId ? { captureLeaseId: args.captureLeaseId } : {}),
      ...(isGuestCapabilityCheckout
        ? {
            captureCapabilityHash: args.captureCapabilityHash,
            captureCapabilityExpiresAt: { gt: authorizedAt },
            captureCapabilityConsumedAt: null,
          }
        : { captureCapabilityHash: null }),
    },
    data: {
      status: "PAID",
      ...(args.captureLeaseId ? { captureLeaseId: null, captureLeaseExpiresAt: null } : {}),
      ...(isGuestCapabilityCheckout ? { captureCapabilityConsumedAt: consumedAt } : {}),
    },
  });

  if (transition.count === 0) {
    const latest = await tx.checkout.findUnique({ where: { id: checkout.id } });
    if (
      latest?.status === "PAID"
      && latest.provider === args.provider
      && latest.providerRef === args.providerRef
      && (!isGuestCapabilityCheckout || latest.captureCapabilityHash === args.captureCapabilityHash)
    ) {
      return { ok: true, alreadyPaid: true };
    }
    return { ok: false, reason: "checkout_not_payable" };
  }

  for (const item of checkout.items) {
    await tx.customerLibrary.upsert({
      where: { userId_productId: { userId: checkout.userId, productId: item.productId } },
      update: {},
      create: { userId: checkout.userId, productId: item.productId },
    });
  }

  return { ok: true, alreadyPaid: false };
}
