import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { capturePayPalOrder } from "@/lib/paypal";
import { isValidPayPalCapture, fulfillPaidCheckout } from "@/lib/payment-fulfillment";
import {
  authorizePayPalCapture,
  getPayPalCaptureCookieName,
  isSameOriginPayPalCaptureRequest,
  PAYPAL_CAPTURE_COOKIE_PATH,
} from "@/lib/paypal-capture-capability.mjs";
import { paymentErrorPayload } from "@/lib/payment-error.mjs";

function buildSuccessResponse(orderId: string, guestCapture: boolean) {
  const response = NextResponse.json({
    ok: true,
    successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/biblioteca`,
  });

  if (guestCapture) {
    response.cookies.set(getPayPalCaptureCookieName(orderId), "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: PAYPAL_CAPTURE_COOKIE_PATH,
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return response;
}

export async function POST(request: Request) {
  if (!isSameOriginPayPalCaptureRequest(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "capture_origin_invalid" }, { status: 403 });
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

  const input = body as { orderId?: unknown };
  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";

  if (!orderId || orderId.length > 128) {
    return NextResponse.json({ error: "orderId inválido." }, { status: 400 });
  }

  try {
    // Resolve the checkout locally; the provider order ID is only a reference,
    // never an authorization capability.
    const checkout = await prisma.checkout.findUnique({
      where: { providerRef: orderId },
      include: { items: true },
    });

    if (!checkout || checkout.provider !== "PAYPAL") {
      return NextResponse.json({ error: "Checkout não encontrado." }, { status: 404 });
    }

    const currentUser = await getCurrentUser();
    const cookieStore = await cookies();
    const capability = cookieStore.get(getPayPalCaptureCookieName(orderId))?.value ?? null;
    const authorization = authorizePayPalCapture({
      checkout,
      currentUserId: currentUser?.id ?? null,
      capability,
    });

    if (!authorization.ok) {
      const status = authorization.reason === "authentication_required"
        || authorization.reason === "guest_capability_required"
        ? 401
        : 403;
      return NextResponse.json({ error: "capture_not_authorized" }, { status });
    }

    if (checkout.status === "PAID") {
      return buildSuccessResponse(orderId, authorization.mode === "guest");
    }

    if (checkout.status !== "PENDING") {
      return NextResponse.json(
        { error: "Checkout não está disponível para pagamento." },
        { status: 409 }
      );
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

    // The guest capability is consumed atomically with PAID + entitlement.
    // PayPal's request ID remains the local checkout ID for safe provider retry.
    const fulfillment = await prisma.$transaction((tx) => fulfillPaidCheckout(tx, {
      checkoutId: checkout.id,
      provider: "PAYPAL",
      providerRef: orderId,
      ...(authorization.mode === "guest"
        ? { captureCapabilityHash: authorization.capabilityHash }
        : {}),
    }));

    if (!fulfillment.ok) {
      return NextResponse.json({ error: fulfillment.reason }, { status: 409 });
    }

    return buildSuccessResponse(orderId, authorization.mode === "guest");
  } catch {
    return NextResponse.json(
      paymentErrorPayload("payment_capture_failed"),
      { status: 500 }
    );
  }
}
