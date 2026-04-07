import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudioApiKey, asHttpErrorStatus } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);

    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      system: "baribudos-studio-website",
      status: "healthy",
      environment: process.env.NODE_ENV || "development",
      site_url: process.env.NEXT_PUBLIC_SITE_URL || "",
      checked_at: new Date().toISOString(),
      services: {
        database: {
          ok: true,
          provider: "postgresql",
        },
        intake_publish: {
          ok: true,
          endpoint: "/api/studio/publish",
        },
        summary_status: {
          ok: true,
          endpoint: "/api/studio/status/summary",
        },
        catalog_status: {
          ok: true,
          endpoint: "/api/studio/status/catalog",
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        system: "baribudos-studio-website",
        status: "degraded",
        checked_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: asHttpErrorStatus(error, 500) }
    );
  }
}
