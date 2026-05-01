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
      memory_boundaries: {
        website_stores_operational_memory: false,
        website_role: "public catalog, products, publications, bundles and commercial state",
        studio_local_memory: "Studio installed on the home PC keeps live operational memory and can connect to local Obsidian.",
        development_memory_repo: "AndreVazao/andreos-memory stores programming context, repository audit notes and development decisions only.",
        studio_runtime_path: "storage/memory/AndreOS",
      },
      rules: {
        accepts_studio_control: true,
        stores_secrets: false,
        exposes_public_catalog: true,
        stores_live_pc_runtime_memory: false,
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
