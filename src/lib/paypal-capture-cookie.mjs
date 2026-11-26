import {
  PAYPAL_CAPTURE_CAPABILITY_TTL_SECONDS,
  PAYPAL_CAPTURE_COOKIE_PATH,
} from "./paypal-capture-capability.mjs";

export function getPayPalCaptureCookieOptions(isProduction = false) {
  return {
    httpOnly: true,
    secure: isProduction === true,
    sameSite: "lax",
    path: PAYPAL_CAPTURE_COOKIE_PATH,
    maxAge: PAYPAL_CAPTURE_CAPABILITY_TTL_SECONDS,
  };
}

export function getExpiredPayPalCaptureCookieOptions(isProduction = false) {
  return {
    ...getPayPalCaptureCookieOptions(isProduction),
    maxAge: 0,
    expires: new Date(0),
  };
}
