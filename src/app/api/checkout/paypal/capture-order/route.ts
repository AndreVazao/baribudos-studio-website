import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
import { isValidPayPalCapture, fulfillPaidCheckout } from "@/lib/payment-fulfillment";
import {
  authorizePayPalCapture,
  getPayPalCaptureCookieName,
  isSameOriginPayPalCaptureRequest,
  PAYPAL_CAPTURE_COOKIE_PATH,
} from "@/lib/paypal-capture-capability.mjs";
import { getExpiredPayPalCaptureCookieOptions } from "@/lib/paypal-capture-cookie.mjs";
import { paymentErrorPayload } from "@/lib/payment-error.mjs";
import { handlePayPalCaptureRequest } from "@/lib/paypal-capture-handler";

export async function POST(request: Request) {
  const result = await handlePayPalCaptureRequest(request, {
    isSameOrigin: isSameOriginPayPalCaptureRequest,
    findCheckout: (orderId) => prisma.checkout.findUnique({
      where: { providerRef: orderId },
      include: { items: true },
    }),
    getCurrentUser,
    getCapability: async (orderId) => {
      const cookieStore = await cookies();
      return cookieStore.get(getPayPalCaptureCookieName(orderId))?.value ?? null;
    },
    authorize: authorizePayPalCapture,
    getPayPalOrder,
    capturePayPalOrder,
    isValidCapture: (capture, expected) => isValidPayPalCapture(
      capture as Parameters<typeof isValidPayPalCapture>[0],
      expected,
    ),
    fulfillPaidCheckout: (input) => prisma.$transaction((tx) => fulfillPaidCheckout(tx, input)),
    successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/biblioteca`,
    paymentErrorPayload,
  });

  const response = NextResponse.json(result.body, { status: result.status });

  if (result.clearGuestCapabilityCookie && result.orderId) {
    response.cookies.set(
      getPayPalCaptureCookieName(result.orderId),
      "",
      getExpiredPayPalCaptureCookieOptions(process.env.NODE_ENV === "production"),
    );
  }

  return response;
}
