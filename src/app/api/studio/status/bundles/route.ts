import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudioApiKey } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || 20), 100));

    const bundles = await prisma.bundleGroup.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        items: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      bundles: bundles.map((bundle) => ({
        group_id: bundle.groupId,
        slug: bundle.slug,
        name: bundle.name,
        description: bundle.description,
        group_type: bundle.groupType,
        price_cents: bundle.priceCents,
        currency: bundle.currency,
        active: bundle.active,
        featured: bundle.featured,
        updated_at: bundle.updatedAt,
        created_at: bundle.createdAt,
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
