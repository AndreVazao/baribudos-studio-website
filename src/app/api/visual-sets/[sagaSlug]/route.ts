import { NextResponse } from "next/server";
import { getSagaVisualSet } from "@/lib/saga-visual-sets";

export async function GET(
  _request: Request,
  { params }: { params: { sagaSlug: string } }
) {
  const sagaSlug = String(params?.sagaSlug || "").trim().toLowerCase();
  const visualSet = getSagaVisualSet(sagaSlug);

  if (!visualSet) {
    return NextResponse.json(
      { ok: false, error: "Visual set não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    item: visualSet,
  });
}
