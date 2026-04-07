import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listLocalSagaVisualSets, normalizeSagaVisualSet } from "@/lib/saga-visual-sets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const persisted = await prisma.sagaVisualSet.findMany({
      where: { active: true },
      orderBy: [{ updatedAt: "desc" }],
    });

    const databaseItems = persisted
      .map((item) => normalizeSagaVisualSet(item.payloadJson))
      .filter(Boolean);

    const items = databaseItems.length > 0 ? databaseItems : listLocalSagaVisualSets();

    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
      source: databaseItems.length > 0 ? "database" : "fallback_local",
    });
  } catch {
    const items = listLocalSagaVisualSets();
    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
      source: "fallback_local",
    });
  }
}
