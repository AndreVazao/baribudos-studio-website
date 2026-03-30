import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudioApiKey } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    assertStudioApiKey(request);

    const [
      ipCount,
      publicationCount,
      variantCount,
      productCount,
      activeProductCount,
      userCount,
      orderCount,
      paidOrderCount,
      recentPublications,
      recentProducts,
    ] = await Promise.all([
      prisma.intellectualProperty.count(),
      prisma.publication.count(),
      prisma.publicationVariant.count(),
      prisma.product.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.user.count(),
      prisma.checkout.count(),
      prisma.checkout.count({ where: { status: "PAID" } }),
      prisma.publication.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          ip: true,
          variants: {
            orderBy: { updatedAt: "desc" },
            take: 3,
          },
        },
      }),
      prisma.product.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: {
          variant: true,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      system: "baribudos-studio-website",
      environment: process.env.NODE_ENV || "development",
      checked_at: new Date().toISOString(),
      counters: {
        ips: ipCount,
        publications: publicationCount,
        variants: variantCount,
        products: productCount,
        active_products: activeProductCount,
        users: userCount,
        orders: orderCount,
        paid_orders: paidOrderCount,
      },
      recent_publications: recentPublications.map((publication) => ({
        publication_id: publication.publicationId,
        project_id: publication.projectId,
        project_slug: publication.projectSlug,
        channel: publication.channel,
        language: publication.language,
        status: publication.status,
        ip_slug: publication.ip?.slug || "",
        ip_name: publication.ip?.name || "",
        updated_at: publication.updatedAt,
        variants: publication.variants.map((variant) => ({
          variant_id: variant.variantId,
          slug: variant.slug,
          title: variant.title,
          format: variant.format,
          language: variant.language,
          published: variant.published,
          updated_at: variant.updatedAt,
        })),
      })),
      recent_products: recentProducts.map((product) => ({
        id: product.id,
        slug: product.slug,
        title: product.title,
        type: product.type,
        active: product.active,
        featured: product.featured,
        price_cents: product.priceCents,
        currency: product.currency,
        updated_at: product.updatedAt,
        variant_id: product.variant?.variantId || "",
        project_id: product.variant?.projectId || "",
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
