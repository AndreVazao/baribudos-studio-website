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

  if (!expected || !received || received !== expected) {
    throw new UnauthorizedStudioRequestError()
  }
}

export function assertAdminKey(request: Request) {
  const expected = readSecret(["ADMIN_PANEL_KEY", "STUDIO_ADMIN_PANEL_KEY"])
  const received = readHeader(request, "x-admin-key")

  if (!expected || !received || received !== expected) {
    throw new UnauthorizedAdminRequestError()
  }
}

export function asHttpErrorStatus(error: unknown, fallback = 400) {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error).status)
    if (Number.isFinite(status) && status >= 400) {
      return status
    }
  }
  return fallback
}
