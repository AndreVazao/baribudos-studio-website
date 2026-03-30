import { NextResponse } from "next/server";
import { assertStudioApiKey } from "@/lib/auth";
import { listSagaVisualSets } from "@/lib/saga-visual-sets";

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);

    const items = listSagaVisualSets();

    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 400 }
    );
  }
}
