import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth-session";
import { isSameOriginPayPalCaptureRequest } from "@/lib/paypal-capture-capability.mjs";
import { paymentErrorPayload } from "@/lib/payment-error.mjs";

export async function POST(request: Request) {
  // Stripe checkout creation also mutates server state; reject cross-origin requests.
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
        provider: "STRIPE",
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

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: normalizedEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: product.currency.toLowerCase(),
            unit_amount: product.priceCents,
            product_data: {
              name: product.title,
            },
          },
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sucesso?provider=stripe`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/loja/${product.slug}`,
      metadata: {
        checkoutId: checkout.id,
        userEmail: normalizedEmail,
      },
    });

    if (!session.id || typeof session.url !== "string" || !session.url) {
      await prisma.checkout.updateMany({
        where: { id: checkout.id, status: "PENDING", providerRef: null },
        data: { status: "FAILED" },
      });
      createdCheckoutId = null;
      return NextResponse.json({ error: "Resposta Stripe inválida." }, { status: 502 });
    }

    await prisma.checkout.update({
      where: { id: checkout.id },
      data: {
        providerRef: session.id,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch {
    if (createdCheckoutId) {
      try {
        await prisma.checkout.updateMany({
          where: { id: createdCheckoutId, status: "PENDING", providerRef: null },
          data: { status: "FAILED" },
        });
      } catch {
        // Keep the generic error; database reconciliation must handle residual orphans.
      }
    }
    return NextResponse.json(
      paymentErrorPayload("checkout_creation_failed"),
      { status: 500 }
    );
  }
}
