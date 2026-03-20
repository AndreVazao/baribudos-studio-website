import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "baribudos_session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const needsAuth =
    pathname.startsWith("/biblioteca") ||
    pathname.startsWith("/conta") ||
    pathname.startsWith("/admin");

  if (needsAuth && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/biblioteca/:path*", "/conta/:path*", "/admin/:path*"],
};
