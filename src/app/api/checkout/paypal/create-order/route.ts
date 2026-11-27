import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder } from "@/lib/paypal";
import { getCurrentUser } from "@/lib/auth-session";
import {
  createPayPalCaptureCapability,
  getPayPalCaptureCookieName,
  isSameOriginPayPalCaptureRequest,
} from "@/lib/paypal-capture-capability.mjs";
import { getPayPalCaptureCookieOptions } from "@/lib/paypal-capture-cookie.mjs";
import { paymentErrorPayload } from "@/lib/payment-error.mjs";

export async function POST(request: Request) {
  // Checkout creation is state-changing and must not be triggerable cross-origin.
  if (!isSameOriginPayPalCaptureRequest(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const input = body as { productId?: unknown; email?: unknown };
  const productId = typeof input.productId === "string" ? input.productId.trim() : "";
  const email = input.email;

  if (!productId) {
    return NextResponse.json(
      { error: "productId é obrigatório." },
      { status: 400 }
    );
  }

  let createdCheckoutId: string | null = null;
  try {
    const currentUser = await getCurrentUser();
    const normalizedEmail = currentUser?.email || String(email || "").toLowerCase().trim();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Sessão ou email obrigatório." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      return NextResponse.json({ error: "Produto indisponível." }, { status: 404 });
    }

    const user = currentUser
      ? currentUser
      : await prisma.user.upsert({
          where: { email: normalizedEmail },
          update: {},
          create: {
            email: normalizedEmail,
            passwordHash: "TEMP_EXTERNAL_CHECKOUT_ONLY",
            role: "CUSTOMER",
          },
        });

    const checkout = await prisma.checkout.create({
      data: {
        userId: user.id,
        provider: "PAYPAL",
        amountCents: product.priceCents,
        currency: product.currency,
        status: "PENDING",
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            unitAmountCents: product.priceCents,
          },
        },
      },
    });
    createdCheckoutId = checkout.id;

    const order = await createPayPalOrder({
      amountCents: product.priceCents,
      currency: product.currency,
      description: product.title,
      customId: checkout.id,
    });
    const orderId = typeof order?.id === "string" ? order.id.trim() : "";
    const approveUrl = Array.isArray(order?.links)
      ? order.links.find((link: { rel?: string }) => link.rel === "approve")?.href
      : null;

    let approvalLinkIsTrusted = false;
    if (typeof approveUrl === "string" && approveUrl) {
      try {
        const parsedApprovalUrl = new URL(approveUrl);
        approvalLinkIsTrusted = parsedApprovalUrl.protocol === "https:"
          && (parsedApprovalUrl.hostname === "paypal.com" || parsedApprovalUrl.hostname.endsWith(".paypal.com"));
      } catch {
        approvalLinkIsTrusted = false;
      }
    }

    if (!orderId || orderId.length > 128 || !approvalLinkIsTrusted) {
      await prisma.checkout.updateMany({
        where: { id: checkout.id, status: "PENDING", providerRef: null },
        data: { status: "FAILED" },
      });
      createdCheckoutId = null;
      return NextResponse.json(
        { error: "Resposta PayPal inválida." },
        { status: 502 }
      );
    }

    // Guest checkout receives a checkout-specific HttpOnly cookie. The raw
    // capability is never persisted or returned in the JSON response.
    const guestCapability = currentUser ? null : createPayPalCaptureCapability();

    await prisma.checkout.update({
      where: { id: checkout.id },
      data: {
        providerRef: orderId,
        ...(guestCapability
          ? {
              captureCapabilityHash: guestCapability.tokenHash,
              captureCapabilityExpiresAt: guestCapability.expiresAt,
            }
          : {}),
      },
    });

    const response = NextResponse.json({
      ok: true,
      approveUrl,
    });

    if (guestCapability) {
      response.cookies.set(
        getPayPalCaptureCookieName(orderId),
        guestCapability.token,
        getPayPalCaptureCookieOptions(process.env.NODE_ENV === "production"),
      );
    }

    return response;
  } catch {
    // A provider or local persistence error must not strand an unpayable
    // PENDING checkout without a PayPal reference.
    if (createdCheckoutId) {
      try {
        await prisma.checkout.updateMany({
          where: { id: createdCheckoutId, status: "PENDING", providerRef: null },
          data: { status: "FAILED" },
        });
      } catch {
        // Preserve the generic payment error; a reconciliation job handles any
        // remaining orphaned checkout if the database is temporarily unavailable.
      }
    }
    return NextResponse.json(
      paymentErrorPayload("checkout_creation_failed"),
      { status: 500 }
    );
  }
}
