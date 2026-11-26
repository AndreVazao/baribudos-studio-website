import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { createSessionToken, getAuthCookieName } from "@/lib/auth-session"
import { hashGuestLibraryClaimToken } from "@/lib/guest-library-claim.mjs"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 })
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 })
  }

  const input = body as { token?: unknown; password?: unknown }
  const token = typeof input.token === "string" ? input.token.trim() : ""
  const password = typeof input.password === "string" ? input.password : ""
  if (token.length < 40 || token.length > 128) {
    return NextResponse.json({ error: "Link de acesso inválido ou expirado." }, { status: 404 })
  }
  if (password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: "A palavra-passe deve ter entre 12 e 128 caracteres." }, { status: 400 })
  }

  const tokenHash = hashGuestLibraryClaimToken(token)
  const now = new Date()
  const checkout = await prisma.checkout.findFirst({
    where: {
      guestCheckout: true,
      status: "PAID",
      guestClaimTokenHash: tokenHash,
      guestClaimExpiresAt: { gt: now },
      guestClaimConsumedAt: null,
    },
    include: { user: true },
  })

  if (!checkout || !checkout.user.isGuestAccount || !checkout.user.isActive) {
    return NextResponse.json({ error: "Link de acesso inválido ou expirado." }, { status: 404 })
  }

  const passwordHash = await hashPassword(password)
  try {
    const user = await prisma.$transaction(async (tx) => {
      const consumed = await tx.checkout.updateMany({
        where: {
          id: checkout.id,
          guestCheckout: true,
          status: "PAID",
          guestClaimTokenHash: tokenHash,
          guestClaimExpiresAt: { gt: now },
          guestClaimConsumedAt: null,
        },
        data: { guestClaimConsumedAt: now },
      })
      if (consumed.count !== 1) throw new Error("guest_claim_already_consumed")

      const updated = await tx.user.updateMany({
        where: { id: checkout.userId, isGuestAccount: true, isActive: true },
        data: { passwordHash, isGuestAccount: false },
      })
      if (updated.count !== 1) throw new Error("guest_account_already_claimed")

      await tx.checkout.updateMany({
        where: {
          userId: checkout.userId,
          guestCheckout: true,
          guestClaimConsumedAt: null,
        },
        data: { guestClaimConsumedAt: now },
      })

      const claimedUser = await tx.user.findUnique({ where: { id: checkout.userId } })
      if (!claimedUser) throw new Error("guest_user_missing")
      return claimedUser
    })

    const sessionToken = await createSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    })
    const response = NextResponse.json({ ok: true, redirectTo: "/biblioteca" })
    response.cookies.set(getAuthCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
    return response
  } catch {
    return NextResponse.json(
      { error: "Não foi possível reclamar esta conta. O link pode já ter sido utilizado." },
      { status: 409 }
    )
  }
}
