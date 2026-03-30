import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalSagaVisualSet, normalizeSagaVisualSet } from "@/lib/saga-visual-sets";

export async function GET(
  _request: Request,
  { params }: { params: { sagaSlug: string } }
) {
  const sagaSlug = String(params?.sagaSlug || "").trim().toLowerCase();

  const persisted = await prisma.sagaVisualSet.findFirst({
    where: { sagaSlug, active: true },
    orderBy: { updatedAt: "desc" },
  });

  const visualSet = normalizeSagaVisualSet(persisted?.payloadJson) ?? getLocalSagaVisualSet(sagaSlug);

  if (!visualSet) {
    return NextResponse.json(
      { ok: false, error: "Visual set não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    item: visualSet,
    source: persisted ? "database" : "fallback_local",
  });
}
