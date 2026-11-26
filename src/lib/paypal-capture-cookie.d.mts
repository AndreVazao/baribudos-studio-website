export type PayPalCaptureCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  expires?: Date;
};

export function getPayPalCaptureCookieOptions(isProduction?: boolean): PayPalCaptureCookieOptions;
export function getExpiredPayPalCaptureCookieOptions(isProduction?: boolean): PayPalCaptureCookieOptions;
