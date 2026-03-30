import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || 12), 50));

    const [products, bundles] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
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
            },
          },
        },
      }),
      prisma.bundleGroup.findMany({
        where: { active: true },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        take: limit,
        include: {
          items: {
            orderBy: { position: "asc" },
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      products: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        title: product.title,
        type: product.type,
        price_cents: product.priceCents,
        currency: product.currency,
        featured: product.featured,
        variant_id: product.variant.variantId,
        project_id: product.variant.projectId,
        publication_id: product.variant.publicationIdRef,
        ip_name: product.variant.publication.ip.name,
        ip_slug: product.variant.publication.ip.slug,
        updated_at: product.updatedAt,
      })),
      bundles: bundles.map((bundle) => ({
        group_id: bundle.groupId,
        slug: bundle.slug,
        name: bundle.name,
        description: bundle.description,
        group_type: bundle.groupType,
        price_cents: bundle.priceCents,
        currency: bundle.currency,
        featured: bundle.featured,
        updated_at: bundle.updatedAt,
        items_count: bundle.items.length,
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
