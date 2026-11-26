import test from "node:test"
import assert from "node:assert/strict"
import {
  buildGuestLibraryClaimUrl,
  createGuestLibraryClaimToken,
  getGuestLibraryClaimConfig,
  hashGuestLibraryClaimToken,
  sendGuestLibraryClaimEmail,
} from "../src/lib/guest-library-claim.mjs"

const env = {
  NODE_ENV: "production",
  RESEND_API_KEY: "re_test_key",
  EMAIL_FROM: "Baribudos <biblioteca@example.com>",
  GUEST_CLAIM_SECRET: "a".repeat(48),
  NEXT_PUBLIC_SITE_URL: "https://baribudos.example",
}

test("guest claim configuration requires email provider, site URL and a strong secret", () => {
  assert.equal(getGuestLibraryClaimConfig({}), null)
  assert.equal(getGuestLibraryClaimConfig({ ...env, GUEST_CLAIM_SECRET: "short" }), null)
  assert.equal(getGuestLibraryClaimConfig({ ...env, NEXT_PUBLIC_SITE_URL: "http://baribudos.example" }), null)
  assert.equal(getGuestLibraryClaimConfig(env)?.siteUrl, "https://baribudos.example")
})

test("guest claim token is deterministic, checkout-bound and expiry-bound", () => {
  const expiry = new Date("2026-12-03T12:00:00.000Z")
  const token = createGuestLibraryClaimToken("checkout-a", expiry, env.GUEST_CLAIM_SECRET)
  assert.equal(token, createGuestLibraryClaimToken("checkout-a", expiry, env.GUEST_CLAIM_SECRET))
  assert.notEqual(token, createGuestLibraryClaimToken("checkout-b", expiry, env.GUEST_CLAIM_SECRET))
  assert.notEqual(token, createGuestLibraryClaimToken("checkout-a", new Date(expiry.getTime() + 1000), env.GUEST_CLAIM_SECRET))
  assert.equal(token.length, 43)
  assert.equal(hashGuestLibraryClaimToken(token).length, 64)
  assert.notEqual(hashGuestLibraryClaimToken(token), token)
})

test("claim URL is fixed to the configured origin and claim page", () => {
  assert.equal(
    buildGuestLibraryClaimUrl("https://baribudos.example", "token-value"),
    "https://baribudos.example/guest-library/claim?token=token-value"
  )
})

test("claim email sends only the one-time link through the configured provider", async () => {
  let captured
  const expiry = new Date("2026-12-03T12:00:00.000Z")
  const result = await sendGuestLibraryClaimEmail({
    to: "Buyer@Example.com",
    token: "opaque-token",
    expiresAt: expiry,
    env,
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) }
      return new Response("", { status: 200 })
    },
  })
  assert.deepEqual(result, { ok: true })
  assert.equal(captured.url, "https://api.resend.com/emails")
  assert.equal(captured.options.headers.Authorization, "Bearer re_test_key")
  assert.deepEqual(captured.body.to, ["buyer@example.com"])
  assert.match(captured.body.text, /guest-library\/claim\?token=opaque-token/)
})

test("provider failure is surfaced without exposing provider response content", async () => {
  await assert.rejects(
    sendGuestLibraryClaimEmail({
      to: "buyer@example.com",
      token: "opaque-token",
      expiresAt: new Date("2026-12-03T12:00:00.000Z"),
      env,
      fetchImpl: async () => new Response("private provider details", { status: 503 }),
    }),
    /guest_library_claim_email_failed/
  )
})
