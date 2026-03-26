import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const bundle = await prisma.bundleGroup.findFirst({
      where: {
        slug,
        active: true,
      },
      include: {
        items: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!bundle) {
      return NextResponse.json({ ok: false, error: "bundle_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      item: {
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
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 400 }
    );
  }
}
