function getRequiredEnv(primaryKey: string, fallbackKeys: string[] = []) {
  for (const key of [primaryKey, ...fallbackKeys]) {
    const value = String(process.env[key] || "").trim()
    if (value) return value
  }
  throw new Error(`Missing required environment variable: ${primaryKey}`)
}

function getBaseUrl() {
  return String(process.env.PAYPAL_MODE || "").trim().toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"
}

function getSiteUrl() {
  return getRequiredEnv("NEXT_PUBLIC_SITE_URL", ["SITE_URL"]).replace(/\/$/, "")
}

async function getPayPalAccessToken() {
  const clientId = getRequiredEnv("PAYPAL_CLIENT_ID")
  const clientSecret = getRequiredEnv("PAYPAL_CLIENT_SECRET", ["PAYPAL_SECRET"])
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })

  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

export async function createPayPalOrder(args: {
  amountCents: number;
  currency: string;
  description: string;
  customId: string;
}) {
  const token = await getPayPalAccessToken()
  const siteUrl = getSiteUrl()

  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: args.customId,
          description: args.description,
          amount: {
            currency_code: args.currency,
            value: (args.amountCents / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        user_action: "PAY_NOW",
        return_url: `${siteUrl}/paypal/return`,
        cancel_url: `${siteUrl}/loja`,
      },
    }),
    cache: "no-store",
  })

  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

export async function capturePayPalOrder(orderId: string) {
  const token = await getPayPalAccessToken()

  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) throw new Error(await response.text())
  return response.json()
}
