import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";

    if (!orderId || orderId.length > 128) {
      return NextResponse.json({ error: "orderId inválido." }, { status: 400 });
    }

    // Resolve the local checkout before calling PayPal. Never capture an arbitrary
    // provider order that is not linked to a checkout created by this application.
    const checkout = await prisma.checkout.findUnique({
      where: { providerRef: orderId },
      include: { items: true },
    });

    if (!checkout || checkout.provider !== "PAYPAL") {
      return NextResponse.json({ error: "Checkout não encontrado." }, { status: 404 });
    }

    if (checkout.status === "PAID") {
      return NextResponse.json({
        ok: true,
        successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/biblioteca`,
      });
    }

    const capture = await capturePayPalOrder(orderId, checkout.id) as {
      id?: string;
      status?: string;
      purchase_units?: Array<{
        custom_id?: string;
        payments?: {
          captures?: Array<{
            status?: string;
            amount?: {
              currency_code?: string;
              value?: string;
            };
          }>;
        };
      }>;
    };

    const purchaseUnit = capture.purchase_units?.find(
      (unit) => unit.custom_id === checkout.id
    );
    const completedCapture = purchaseUnit?.payments?.captures?.find(
      (item) => item.status === "COMPLETED"
    );
    const capturedAmount = completedCapture?.amount;
    const expectedAmount = (checkout.amountCents / 100).toFixed(2);
    const amountMatches =
      capturedAmount?.value === expectedAmount &&
      String(capturedAmount.currency_code || "").toUpperCase() === checkout.currency.toUpperCase();

    if (
      capture.id !== orderId ||
      capture.status !== "COMPLETED" ||
      !purchaseUnit ||
      !completedCapture ||
      !amountMatches
    ) {
      return NextResponse.json(
        { error: "O pagamento PayPal não corresponde ao checkout esperado." },
        { status: 409 }
      );
    }

    // Commit payment state and entitlements together. The unique
    // (userId, productId) key keeps repeated successful captures idempotent.
    await prisma.$transaction(async (tx) => {
      const current = await tx.checkout.findUnique({
        where: { id: checkout.id },
        include: { items: true },
      });

      if (!current || current.provider !== "PAYPAL") {
        throw new Error("Checkout PayPal deixou de existir.");
      }

      if (current.status !== "PAID") {
        await tx.checkout.update({
          where: { id: current.id },
          data: { status: "PAID" },
        });
      }

      for (const item of current.items) {
        await tx.customerLibrary.upsert({
          where: {
            userId_productId: {
              userId: current.userId,
              productId: item.productId,
            },
          },
          update: {},
          create: {
            userId: current.userId,
            productId: item.productId,
          },
        });
      }
    });

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
