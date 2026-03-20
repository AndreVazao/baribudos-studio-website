import { NextResponse } from "next/server";
import { getAuthCookieName } from "@/lib/auth-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(getAuthCookieName(), "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
