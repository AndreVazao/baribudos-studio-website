import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { buildLibraryToken } from "@/lib/library";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
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
    const customerEmail = session.metadata?.customerEmail;

    if (checkoutId && customerEmail) {
      const checkout = await prisma.checkout.findUnique({
        where: { id: checkoutId },
        include: { items: true, customer: true },
      });

      if (checkout) {
        await prisma.checkout.update({
          where: { id: checkout.id },
          data: { status: "PAID" },
        });

        for (const item of checkout.items) {
          await prisma.customerLibrary.upsert({
            where: {
              customerId_productId: {
                customerId: checkout.customerId,
                productId: item.productId,
              },
            },
            update: {},
            create: {
              customerId: checkout.customerId,
              productId: item.productId,
            },
          });
        }

        const token = buildLibraryToken(customerEmail);

        return NextResponse.json({
          ok: true,
          libraryUrl:
            `${process.env.NEXT_PUBLIC_SITE_URL}/sucesso` +
            `?provider=stripe&email=${encodeURIComponent(customerEmail)}` +
            `&token=${encodeURIComponent(token)}`,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
  }
