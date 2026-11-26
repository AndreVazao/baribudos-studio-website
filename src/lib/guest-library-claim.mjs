import { createHash, createHmac } from "node:crypto"

export function getGuestLibraryClaimConfig(env = process.env) {
  const apiKey = String(env.RESEND_API_KEY || "").trim()
  const from = String(env.EMAIL_FROM || "").trim()
  const secret = String(env.GUEST_CLAIM_SECRET || "").trim()
  const siteUrl = String(env.NEXT_PUBLIC_SITE_URL || "").trim()
  if (!apiKey || !from || secret.length < 32 || !siteUrl) return null
  let parsed
  try {
    parsed = new URL(siteUrl)
  } catch {
    return null
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return null
  if (env.NODE_ENV === "production" && parsed.protocol !== "https:") return null
  return { apiKey, from, secret, siteUrl: parsed.origin }
}

export function createGuestLibraryClaimToken(checkoutId, expiresAt, secret) {
  const id = String(checkoutId || "").trim()
  const key = String(secret || "")
  const expiry = expiresAt instanceof Date ? expiresAt.toISOString() : new Date(expiresAt).toISOString()
  if (!id || !key || !Number.isFinite(new Date(expiry).getTime())) {
    throw new Error("invalid_guest_claim_token_input")
  }
  return createHmac("sha256", key)
    .update(`baribudos:guest-library-claim:v1:${id}:${expiry}`)
    .digest("base64url")
}

export function hashGuestLibraryClaimToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex")
}

export function buildGuestLibraryClaimUrl(siteUrl, token) {
  const base = new URL(siteUrl)
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("invalid_guest_claim_site_url")
  base.pathname = "/guest-library/claim"
  base.search = ""
  base.searchParams.set("token", String(token || ""))
  return base.toString()
}

export async function sendGuestLibraryClaimEmail({
  to,
  token,
  expiresAt,
  env = process.env,
  fetchImpl = fetch,
}) {
  const config = getGuestLibraryClaimConfig(env)
  if (!config) throw new Error("guest_library_claim_email_not_configured")
  const recipient = String(to || "").trim().toLowerCase()
  if (!recipient || !recipient.includes("@")) throw new Error("guest_library_claim_recipient_invalid")
  const claimUrl = buildGuestLibraryClaimUrl(config.siteUrl, token)
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [recipient],
      subject: "A tua biblioteca Baribudos está pronta",
      text: [
        "O pagamento foi confirmado.",
        "Para acederes aos teus conteúdos, define uma palavra-passe através deste link:",
        claimUrl,
        `O link expira em ${new Date(expiresAt).toISOString()}.`,
        "Se não fizeste esta compra, ignora esta mensagem.",
      ].join("\n\n"),
      html: `<p>O pagamento foi confirmado.</p><p>Para acederes aos teus conteúdos, define uma palavra-passe:</p><p><a href="${claimUrl}">Abrir a minha biblioteca Baribudos</a></p><p>O link expira em ${new Date(expiresAt).toISOString()}.</p><p>Se não fizeste esta compra, ignora esta mensagem.</p>`,
    }),
  })
  if (!response.ok) throw new Error("guest_library_claim_email_failed")
  return { ok: true }
}
