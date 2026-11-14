import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook inválido.",
      },
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

    const amountMatches = session.amount_total === checkout.amountCents;
    const currencyMatches =
      String(session.currency || "").toUpperCase() === checkout.currency.toUpperCase();

    if (!amountMatches || !currencyMatches) {
      return NextResponse.json(
        { error: "Valor ou moeda Stripe não corresponde ao checkout." },
        { status: 409 }
      );
    }

    // Payment state and entitlements are committed together. Replayed webhook
    // events are safe because checkout state is monotonic and library rows are unique.
    await prisma.$transaction(async (tx) => {
      const current = await tx.checkout.findUnique({
        where: { id: checkout.id },
        include: { items: true },
      });

      if (!current || current.provider !== "STRIPE" || current.providerRef !== session.id) {
        throw new Error("Checkout Stripe deixou de corresponder à sessão.");
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
  }

  return NextResponse.json({ ok: true });
}
