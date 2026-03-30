import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudioApiKey } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicationId: string }> }
) {
  try {
    assertStudioApiKey(request);
    const { publicationId } = await params;

    const publication = await prisma.publication.findUnique({
      where: { publicationId },
      include: {
        ip: true,
        series: true,
        variants: {
          include: {
            assets: true,
            products: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!publication) {
      return NextResponse.json(
        {
          ok: false,
          error: "publication_not_found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      checked_at: new Date().toISOString(),
      publication: {
        publication_id: publication.publicationId,
        project_id: publication.projectId,
        project_slug: publication.projectSlug,
        channel: publication.channel,
        language: publication.language,
        status: publication.status,
        created_at: publication.createdAt,
        updated_at: publication.updatedAt,
        ip: publication.ip
          ? {
              slug: publication.ip.slug,
              name: publication.ip.name,
            }
          : null,
        series: publication.series
          ? {
              slug: publication.series.slug,
              name: publication.series.name,
            }
          : null,
        variants: publication.variants.map((variant) => ({
          variant_id: variant.variantId,
          slug: variant.slug,
          project_id: variant.projectId,
          language: variant.language,
          format: variant.format,
          title: variant.title,
          short_description: variant.shortDescription,
          published: variant.published,
          updated_at: variant.updatedAt,
          asset_roles: variant.assets.map((asset) => asset.role),
          products: variant.products.map((product) => ({
            id: product.id,
            slug: product.slug,
            title: product.title,
            type: product.type,
            active: product.active,
            featured: product.featured,
            price_cents: product.priceCents,
            currency: product.currency,
            updated_at: product.updatedAt,
          })),
        })),
      },
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
