import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || 24), 100));
    const featuredOnly = searchParams.get("featured") === "1";

    const bundles = await prisma.bundleGroup.findMany({
      where: {
        active: true,
        ...(featuredOnly ? { featured: true } : {}),
      },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: limit,
      include: {
        items: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      count: bundles.length,
      items: bundles.map((bundle) => ({
        group_id: bundle.groupId,
        slug: bundle.slug,
        name: bundle.name,
        description: bundle.description,
        group_type: bundle.groupType,
        price_cents: bundle.priceCents,
        currency: bundle.currency,
        featured: bundle.featured,
        updated_at: bundle.updatedAt,
        items: bundle.items.map((item) => ({
          product_id: item.productId,
          slug: item.productSlug,
          title: item.title,
          type: item.type,
          currency: item.currency,
          price_cents: item.priceCents,
          position: item.position,
        })),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 400 }
    );
  }
}
