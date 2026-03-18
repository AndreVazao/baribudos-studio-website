import crypto from "crypto";

export function buildLibraryToken(email: string) {
  const secret = process.env.LIBRARY_TOKEN_SECRET as string;
  const payload = JSON.stringify({
    email: email.toLowerCase().trim(),
    ts: Date.now(),
  });

  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

export function verifyLibraryToken(token: string) {
  const secret = process.env.LIBRARY_TOKEN_SECRET as string;
  const [payloadBase64, signature] = token.split(".");

  if (!payloadBase64 || !signature) {
    throw new Error("Token inválido.");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url");

  if (expected !== signature) {
    throw new Error("Assinatura inválida.");
  }

  return JSON.parse(
    Buffer.from(payloadBase64, "base64url").toString("utf8")
  ) as { email: string; ts: number };
}
