import { timingSafeEqual } from "node:crypto";

function constantTimeSecretEqual(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");

  if (expectedBytes.length !== receivedBytes.length) {
    return false;
  }

  return timingSafeEqual(expectedBytes, receivedBytes);
}

class UnauthorizedStudioRequestError extends Error {
  status = 401
  constructor(message = "Unauthorized studio request.") {
    super(message)
    this.name = "UnauthorizedStudioRequestError"
  }
}

class UnauthorizedAdminRequestError extends Error {
  status = 401
  constructor(message = "Unauthorized admin request.") {
    super(message)
    this.name = "UnauthorizedAdminRequestError"
  }
}

function readSecret(candidates: string[]) {
  for (const key of candidates) {
    const value = String(process.env[key] || "").trim()
    if (value) return value
  }
  return ""
}

function readHeader(request: Request, headerName: string) {
  return String(request.headers.get(headerName) || "").trim()
}

export function assertStudioApiKey(request: Request) {
  const expected = readSecret(["STUDIO_PUBLISH_API_KEY", "STUDIO_API_KEY"])
  const received = readHeader(request, "x-studio-api-key")

  if (!expected || !received || !constantTimeSecretEqual(expected, received)) {
    throw new UnauthorizedStudioRequestError()
  }
}

export function assertAdminKey(request: Request) {
  const expected = readSecret(["ADMIN_PANEL_KEY", "STUDIO_ADMIN_PANEL_KEY"])
  const received = readHeader(request, "x-admin-key")

  if (!expected || !received || !constantTimeSecretEqual(expected, received)) {
    throw new UnauthorizedAdminRequestError()
  }
}

export function isRetryablePrismaTransactionConflict(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2034"
  )
}

export function asHttpErrorStatus(error: unknown, fallback = 400) {
  if (isRetryablePrismaTransactionConflict(error)) {
    return 409
  }

  if (error && typeof error === "object" && "status" in error) {
    const status = Number(error.status)
    if (Number.isFinite(status) && status >= 400) {
      return status
    }
  }
  return fallback
}

export function buildPublicationErrorResponse(error: unknown, fallback = 500) {
  const retryableConflict = isRetryablePrismaTransactionConflict(error)
  const status = asHttpErrorStatus(error, fallback)

  return {
    status,
    body: {
      ok: false,
      error: retryableConflict
        ? "retryable_transaction_conflict"
        : status >= 500
          ? "internal_error"
          : error instanceof Error
            ? error.message
            : "request_failed",
      ...(retryableConflict ? { retryable: true } : {}),
    },
    retryAfter: retryableConflict ? "1" : null,
  }
}
