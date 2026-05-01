import { NextResponse } from "next/server";
import { assertStudioApiKey, asHttpErrorStatus } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);

    return NextResponse.json({
      ok: true,
      system: "baribudos-studio-website",
      feature: "studio-memory-link",
      status: "ready",
      checked_at: new Date().toISOString(),
      role: "public_commerce_layer",
      controller: "baribudos-studio",
      persistent_memory: {
        stores_memory: false,
        reason: "The website exposes public/commercial state. Operational memory belongs to Baribudos Studio and AndreOS Memory.",
        studio_runtime_path: "storage/memory/AndreOS",
        private_memory_repo: "AndreVazao/andreos-memory",
      },
      rules: {
        accepts_studio_control: true,
        stores_secrets: false,
        exposes_public_catalog: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        system: "baribudos-studio-website",
        feature: "studio-memory-link",
        status: "error",
        checked_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: asHttpErrorStatus(error, 500) }
    );
  }
}
