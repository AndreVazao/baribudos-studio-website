import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder } from "@/lib/paypal";
import { getCurrentUser } from "@/lib/auth-session";
import { resolveCheckoutUser } from "@/lib/guest-checkout-user";
import { getGuestLibraryClaimConfig } from "@/lib/guest-library-claim.mjs";
import {
  createPayPalCaptureCapability,
  getPayPalCaptureCookieName,
} from "@/lib/paypal-capture-capability.mjs";
import { getPayPalCaptureCookieOptions } from "@/lib/paypal-capture-cookie.mjs";
import { paymentErrorPayload } from "@/lib/payment-error.mjs";

export async function POST(request: Request) {
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

  try {
    const currentUser = await getCurrentUser();
    const normalizedEmail = currentUser?.email || String(email || "").toLowerCase().trim();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Sessão ou email obrigatório." },
        { status: 400 }
      );
    }
    if (!currentUser && !getGuestLibraryClaimConfig()) {
      return NextResponse.json(
        { error: "Checkout convidado temporariamente indisponível. Inicia sessão ou tenta mais tarde." },
        { status: 503 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      return NextResponse.json({ error: "Produto indisponível." }, { status: 404 });
    }

    const checkoutUser = await resolveCheckoutUser({
      currentUser,
      email: normalizedEmail,
    });
    if (!checkoutUser.ok) {
      return NextResponse.json(
        { error: checkoutUser.reason === "account_requires_login"
          ? "Já existe uma conta com este email. Inicia sessão para continuar."
          : "Email inválido." },
        { status: checkoutUser.reason === "account_requires_login" ? 409 : 400 }
      );
    }

    const checkout = await prisma.checkout.create({
      data: {
        userId: checkoutUser.user.id,
        guestCheckout: checkoutUser.guestCheckout,
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

    if (!orderId || orderId.length > 128 || typeof approveUrl !== "string" || !approveUrl) {
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
    return NextResponse.json(
      paymentErrorPayload("checkout_creation_failed"),
      { status: 500 }
    );
  }
}
