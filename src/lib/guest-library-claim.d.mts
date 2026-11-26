export type GuestLibraryClaimConfig = {
  apiKey: string
  from: string
  secret: string
  siteUrl: string
}
export function getGuestLibraryClaimConfig(env?: Record<string, string | undefined>): GuestLibraryClaimConfig | null
export function createGuestLibraryClaimToken(checkoutId: string, expiresAt: Date | string, secret: string): string
export function hashGuestLibraryClaimToken(token: string): string
export function buildGuestLibraryClaimUrl(siteUrl: string, token: string): string
export function sendGuestLibraryClaimEmail(args: {
  to: string
  token: string
  expiresAt: Date | string
  env?: Record<string, string | undefined>
  fetchImpl?: typeof fetch
}): Promise<{ ok: true }>
