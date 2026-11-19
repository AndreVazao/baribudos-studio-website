import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";
import { isValidPayPalCapture, fulfillPaidCheckout } from "@/lib/payment-fulfillment";
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

  const input = body as { orderId?: unknown };
  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";

  if (!orderId || orderId.length > 128) {
    return NextResponse.json({ error: "orderId inválido." }, { status: 400 });
  }

  try {
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

    if (checkout.status !== "PENDING") {
      return NextResponse.json({ error: "Checkout não está disponível para pagamento." }, { status: 409 });
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

    if (!isValidPayPalCapture(capture, {
      orderId,
      checkoutId: checkout.id,
      amountCents: checkout.amountCents,
      currency: checkout.currency,
    })) {
      return NextResponse.json(
        { error: "O pagamento PayPal não corresponde ao checkout esperado." },
        { status: 409 }
      );
    }

    // Commit payment state and entitlements together. The unique
    // (userId, productId) key keeps repeated successful captures idempotent.
    const fulfillment = await prisma.$transaction((tx) => fulfillPaidCheckout(tx, {
      checkoutId: checkout.id,
      provider: "PAYPAL",
      providerRef: orderId,
    }));

    if (!fulfillment.ok) {
      return NextResponse.json({ error: fulfillment.reason }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/biblioteca`,
    });
  } catch {
    return NextResponse.json(
      paymentErrorPayload("payment_capture_failed"),
      { status: 500 }
    );
  }
}
