export const PAYPAL_CAPTURE_CAPABILITY_TTL_SECONDS: number;
export const PAYPAL_CAPTURE_COOKIE_PATH: string;

export type PayPalCaptureCheckout = {
  userId: string;
  status: string;
  captureCapabilityHash: string | null;
  captureCapabilityExpiresAt: Date | null;
  captureCapabilityConsumedAt: Date | null;
};

export function hashPayPalCaptureCapability(token: string): string;
export function createPayPalCaptureCapability(now?: Date): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};
export function verifyPayPalCaptureCapability(token: unknown, storedHash: unknown): boolean;
export function getPayPalCaptureCookieName(orderId: string): string;
export function isSameOriginPayPalCaptureRequest(origin: string | null, requestUrl: string): boolean;
export function authorizePayPalCapture(args: {
  checkout: PayPalCaptureCheckout;
  currentUserId: string | null;
  capability: unknown;
  now?: Date;
}):
  | { ok: true; mode: "guest"; capabilityHash: string; authorizedAt: Date }
  | { ok: true; mode: "authenticated" }
  | {
      ok: false;
      reason:
        | "guest_capability_required"
        | "guest_capability_expired"
        | "guest_capability_consumed"
        | "authentication_required"
        | "checkout_owner_mismatch";
    };
