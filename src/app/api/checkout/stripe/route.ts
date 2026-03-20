import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth-session";

export async function POST(request: Request) {
  try {
    const { productId, email } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: "productId é obrigatório." },
        { status: 400 }
      );
    }

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

    await prisma.checkout.update({
      where: { id: checkout.id },
      data: {
        providerRef: session.id,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 400 }
    );
  }
        }
