import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(request: Request) {
  try {
    const { productId, email } = await request.json();

    if (!productId || !email) {
      return NextResponse.json(
        { error: "productId e email são obrigatórios." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      return NextResponse.json({ error: "Produto indisponível." }, { status: 404 });
    }

    const customer = await prisma.customer.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: { email: normalizedEmail },
    });

    const checkout = await prisma.checkout.create({
      data: {
        customerId: customer.id,
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

    await prisma.checkout.update({
      where: { id: checkout.id },
      data: {
        providerRef: order.id,
      },
    });

    const approveUrl = order.links.find((link: any) => link.rel === "approve")?.href;

    if (!approveUrl) {
      return NextResponse.json(
        { error: "Link de aprovação PayPal não encontrado." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      approveUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 400 }
    );
  }
        }
