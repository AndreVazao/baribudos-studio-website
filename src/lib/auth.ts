export function assertStudioApiKey(request: Request) {
  const key = request.headers.get("x-studio-api-key");
  if (!process.env.STUDIO_PUBLISH_API_KEY || key !== process.env.STUDIO_PUBLISH_API_KEY) {
    throw new Error("Unauthorized studio request.");
  }
}

export function assertAdminKey(request: Request) {
  const key = request.headers.get("x-admin-key");
  if (!process.env.ADMIN_PANEL_KEY || key !== process.env.ADMIN_PANEL_KEY) {
    throw new Error("Unauthorized admin request.");
  }
}
