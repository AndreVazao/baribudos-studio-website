import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudioApiKey } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 100);
    const onlyActive = url.searchParams.get("active") === "1";

    const products = await prisma.product.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: limit,
      include: {
        variant: {
          include: {
            publication: {
              include: {
                ip: true,
              },
            },
            assets: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      checked_at: new Date().toISOString(),
      count: products.length,
      filters: {
        limit,
        active_only: onlyActive,
      },
      items: products.map((product) => ({
        product_id: product.id,
        slug: product.slug,
        title: product.title,
        type: product.type,
        active: product.active,
        featured: product.featured,
        price_cents: product.priceCents,
        currency: product.currency,
        updated_at: product.updatedAt,
        variant: {
          variant_id: product.variant.variantId,
          publication_id: product.variant.publicationIdRef,
          project_id: product.variant.projectId,
          project_slug: product.variant.projectSlug,
          language: product.variant.language,
          format: product.variant.format,
          title: product.variant.title,
          short_description: product.variant.shortDescription,
          published: product.variant.published,
        },
        publication: {
          status: product.variant.publication.status,
          channel: product.variant.publication.channel,
          ip_slug: product.variant.publication.ip?.slug || "",
          ip_name: product.variant.publication.ip?.name || "",
        },
        asset_roles: product.variant.assets.map((asset) => asset.role),
      })),
    });
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
