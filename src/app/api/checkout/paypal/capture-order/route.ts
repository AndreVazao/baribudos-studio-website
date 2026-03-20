import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId obrigatório." }, { status: 400 });
    }

    await capturePayPalOrder(orderId);

    const checkout = await prisma.checkout.findUnique({
      where: { providerRef: orderId },
      include: {
        items: true,
        user: true,
      },
    });

    if (!checkout) {
      return NextResponse.json({ error: "Checkout não encontrado." }, { status: 404 });
    }

    await prisma.checkout.update({
      where: { id: checkout.id },
      data: { status: "PAID" },
    });

    for (const item of checkout.items) {
      await prisma.customerLibrary.upsert({
        where: {
          userId_productId: {
            userId: checkout.userId,
            productId: item.productId,
          },
        },
        update: {},
        create: {
          userId: checkout.userId,
          productId: item.productId,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/biblioteca`,
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
