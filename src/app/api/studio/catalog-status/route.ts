import { NextResponse } from "next/server";
import { ProductType } from "@prisma/client";
import { assertStudioApiKey, asHttpErrorStatus } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toText(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);

    const [activeProducts, featuredProducts, ebookCount, audiobookCount, publicationCount] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        take: 12,
        include: {
          variant: {
            include: {
              assets: true,
            },
          },
        },
      }),
      prisma.product.count({ where: { active: true, featured: true } }),
      prisma.product.count({ where: { active: true, type: ProductType.EBOOK } }),
      prisma.product.count({ where: { active: true, type: ProductType.AUDIOBOOK } }),
      prisma.publication.count(),
    ]);

    return NextResponse.json({
      ok: true,
      intake: "studio_catalog_status_v1",
      counts: {
        active_products: activeProducts.length,
        featured_products: featuredProducts,
        ebooks: ebookCount,
        audiobooks: audiobookCount,
        publications: publicationCount,
      },
      latest_products: activeProducts.map((product) => ({
        id: toText(product.id),
        slug: toText(product.slug),
        title: toText(product.title),
        type: toText(product.type),
        price_cents: Number(product.priceCents || 0),
        currency: toText(product.currency),
        featured: Boolean(product.featured),
        variant_id: toText(product.variant?.variantId),
        channel: toText(product.variant?.channel),
        language: toText(product.variant?.language),
        cover: product.variant?.assets?.find((asset) => asset.role === "COVER")?.fileUrl || null,
        updated_at: product.updatedAt.toISOString(),
      })),
      received_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: asHttpErrorStatus(error, 400) }
    );
  }
}
