import { NextResponse } from "next/server";
import { assertStudioApiKey } from "@/lib/auth";
import { getStudioReconcileReport } from "@/lib/studio-control-plane";

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 100);

    const result = await getStudioReconcileReport(limit);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 400 }
    );
  }
}
