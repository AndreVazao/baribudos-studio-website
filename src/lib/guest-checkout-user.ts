import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"

export async function resolveCheckoutUser({
  currentUser,
  email,
}: {
  currentUser: { id: string; email: string } | null
  email: string
}): Promise<
  | { ok: true; user: { id: string; email: string }; guestCheckout: boolean }
  | { ok: false; reason: "email_invalid" | "account_requires_login" }
> {
  if (currentUser) {
    return { ok: true, user: currentUser, guestCheckout: false }
  }

  const normalizedEmail = String(email || "").trim().toLowerCase()
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, reason: "email_invalid" }
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    if (!existing.isGuestAccount) {
      return { ok: false, reason: "account_requires_login" }
    }
    return { ok: true, user: existing, guestCheckout: true }
  }

  const randomPassword = randomBytes(32).toString("base64url")
  const passwordHash = await hashPassword(randomPassword)
  try {
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "CUSTOMER",
        isGuestAccount: true,
      },
    })
    return { ok: true, user, guestCheckout: true }
  } catch (error) {
    if (
      !error
      || typeof error !== "object"
      || !("code" in error)
      || error.code !== "P2002"
    ) {
      throw error
    }
    const raced = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (raced?.isGuestAccount) {
      return { ok: true, user: raced, guestCheckout: true }
    }
    return { ok: false, reason: "account_requires_login" }
  }
}
