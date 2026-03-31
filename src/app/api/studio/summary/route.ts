import { NextResponse } from "next/server";
import { assertStudioApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);

    const [publications, variants, products, activeProducts] = await Promise.all([
      prisma.publication.count(),
      prisma.publicationVariant.count(),
      prisma.product.count(),
      prisma.product.count({ where: { active: true } }),
    ]);

    return NextResponse.json({
      ok: true,
      summary: {
        publications,
        variants,
        products,
        active_products: activeProducts,
        checked_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro interno." }, { status: 400 });
  }
}
