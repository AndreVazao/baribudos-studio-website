import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { isValidStripePaidSession, fulfillPaidCheckout } from "@/lib/payment-fulfillment";
import { paymentErrorPayload } from "@/lib/payment-error.mjs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(paymentErrorPayload("invalid_webhook_signature"), { status: 400 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      paymentErrorPayload("webhook_configuration_error"),
      { status: 500 }
    );
  }

  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!webhookSecret) {
    return NextResponse.json(
      paymentErrorPayload("webhook_configuration_error"),
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json(
      paymentErrorPayload("invalid_webhook_signature"),
      { status: 400 }
    );
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const checkoutId = session.metadata?.checkoutId;

    if (!checkoutId) {
      return NextResponse.json({ error: "Checkout metadata em falta." }, { status: 400 });
    }

    const checkout = await prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: { items: true },
    });

    if (!checkout) {
      return NextResponse.json({ error: "Checkout não encontrado." }, { status: 404 });
    }

    if (checkout.provider !== "STRIPE" || checkout.providerRef !== session.id || session.mode !== "payment") {
      return NextResponse.json({ error: "Sessão Stripe não corresponde ao checkout." }, { status: 409 });
    }

    if (event.type === "checkout.session.async_payment_failed") {
      await prisma.checkout.updateMany({
        where: { id: checkout.id, status: "PENDING" },
        data: { status: "FAILED" },
      });

      return NextResponse.json({ ok: true });
    }

    // checkout.session.completed can arrive before a delayed payment method settles.
    // Only the paid state (or async_payment_succeeded) may grant digital access.
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: true, pending: true });
    }

    if (!isValidStripePaidSession(session, checkout)) {
      return NextResponse.json(
        { error: "Valor, moeda ou estado Stripe não corresponde ao checkout." },
        { status: 409 }
      );
    }

    // Only PENDING can transition to PAID; late success cannot resurrect a failed/canceled checkout.
    const fulfillment = await prisma.$transaction((tx) => fulfillPaidCheckout(tx, {
      checkoutId: checkout.id,
      provider: "STRIPE",
      providerRef: session.id,
    }));

    if (!fulfillment.ok) {
      return NextResponse.json({ error: fulfillment.reason }, { status: 409 });
    }
  }

  return NextResponse.json({ ok: true });
}
