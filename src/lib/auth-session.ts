import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

type SessionPayload = {
  sub: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "CUSTOMER";
};

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET não configurada.");
  }
  return new TextEncoder().encode(secret);
}

export function getAuthCookieName() {
  return process.env.AUTH_COOKIE_NAME || "baribudos_session";
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as unknown as SessionPayload;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;

  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session?.sub) return null;

  return prisma.user.findUnique({
    where: { id: session.sub },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN", "EDITOR"].includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export async function requireManager() {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
