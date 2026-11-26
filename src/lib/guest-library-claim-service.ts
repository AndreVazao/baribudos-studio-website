import { prisma } from "@/lib/prisma"
import {
  createGuestLibraryClaimToken,
  getGuestLibraryClaimConfig,
  hashGuestLibraryClaimToken,
  sendGuestLibraryClaimEmail,
} from "@/lib/guest-library-claim.mjs"

const CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000
const EMAIL_RETRY_COOLDOWN_MS = 60 * 1000

type ClaimResult = {
  isGuest: boolean
  sent: boolean
  claimed?: boolean
  reason?: string
}

async function deliverGuestLibraryClaim(checkoutId: string): Promise<ClaimResult> {
  const config = getGuestLibraryClaimConfig()
  const checkout = await prisma.checkout.findUnique({
    where: { id: checkoutId },
    include: { user: true },
  })

  if (!checkout || !checkout.guestCheckout) {
    return { isGuest: false, sent: true }
  }
  if (checkout.status !== "PAID") {
    return { isGuest: true, sent: false, reason: "checkout_not_paid" }
  }
  if (checkout.guestClaimConsumedAt || !checkout.user.isGuestAccount) {
    return { isGuest: true, sent: true, claimed: true }
  }
  if (!config) {
    return { isGuest: true, sent: false, reason: "guest_claim_not_configured" }
  }

  const now = new Date()
  let current = checkout
  if (
    !current.guestClaimTokenHash
    || !current.guestClaimExpiresAt
    || current.guestClaimExpiresAt <= now
  ) {
    const expiresAt = new Date(now.getTime() + CLAIM_TTL_MS)
    const token = createGuestLibraryClaimToken(current.id, expiresAt, config.secret)
    const tokenHash = hashGuestLibraryClaimToken(token)
    await prisma.checkout.updateMany({
      where: {
        id: current.id,
        status: "PAID",
        guestCheckout: true,
        guestClaimConsumedAt: null,
        OR: [
          { guestClaimTokenHash: null },
          { guestClaimExpiresAt: null },
          { guestClaimExpiresAt: { lte: now } },
        ],
      },
      data: {
        guestClaimTokenHash: tokenHash,
        guestClaimExpiresAt: expiresAt,
        guestClaimEmailSentAt: null,
        guestClaimEmailAttemptedAt: null,
      },
    })
    const refreshed = await prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: { user: true },
    })
    if (!refreshed || !refreshed.guestClaimTokenHash || !refreshed.guestClaimExpiresAt) {
      return { isGuest: true, sent: false, reason: "guest_claim_initialization_failed" }
    }
    current = refreshed
  }

  const expiresAt = current.guestClaimExpiresAt
  const token = createGuestLibraryClaimToken(current.id, expiresAt, config.secret)
  const tokenHash = hashGuestLibraryClaimToken(token)
  if (current.guestClaimTokenHash !== tokenHash) {
    return { isGuest: true, sent: false, reason: "guest_claim_token_mismatch" }
  }
  if (current.guestClaimEmailSentAt) {
    return { isGuest: true, sent: true }
  }

  const retryBefore = new Date(now.getTime() - EMAIL_RETRY_COOLDOWN_MS)
  const attempt = await prisma.checkout.updateMany({
    where: {
      id: current.id,
      status: "PAID",
      guestCheckout: true,
      guestClaimTokenHash: tokenHash,
      guestClaimEmailSentAt: null,
      guestClaimConsumedAt: null,
      OR: [
        { guestClaimEmailAttemptedAt: null },
        { guestClaimEmailAttemptedAt: { lt: retryBefore } },
      ],
    },
    data: { guestClaimEmailAttemptedAt: now },
  })
  if (attempt.count !== 1) {
    const latest = await prisma.checkout.findUnique({ where: { id: checkoutId } })
    if (latest?.guestClaimEmailSentAt) return { isGuest: true, sent: true }
    return { isGuest: true, sent: false, reason: "guest_claim_email_cooldown" }
  }

  try {
    await sendGuestLibraryClaimEmail({
      to: current.user.email,
      token,
      expiresAt,
    })
  } catch {
    return { isGuest: true, sent: false, reason: "guest_claim_email_failed" }
  }

  await prisma.checkout.updateMany({
    where: {
      id: current.id,
      guestClaimTokenHash: tokenHash,
      guestClaimEmailSentAt: null,
      guestClaimConsumedAt: null,
    },
    data: { guestClaimEmailSentAt: new Date() },
  })
  return { isGuest: true, sent: true }
}

export async function sendGuestLibraryClaimForCheckoutId(checkoutId: string): Promise<ClaimResult> {
  return deliverGuestLibraryClaim(checkoutId)
}

export async function sendGuestLibraryClaimForProviderRef(providerRef: string): Promise<ClaimResult> {
  const checkout = await prisma.checkout.findUnique({
    where: { providerRef },
    select: { id: true },
  })
  if (!checkout) return { isGuest: false, sent: true }
  return deliverGuestLibraryClaim(checkout.id)
}
