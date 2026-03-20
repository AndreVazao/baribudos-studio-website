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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const checkoutId = session.metadata?.checkoutId;

    if (checkoutId) {
      const checkout = await prisma.checkout.findUnique({
        where: { id: checkoutId },
        include: { items: true, user: true },
      });

      if (checkout) {
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
      }
    }
  }

  return NextResponse.json({ ok: true });
        }
