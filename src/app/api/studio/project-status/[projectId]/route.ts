import { NextResponse } from "next/server";
import { assertStudioApiKey, asHttpErrorStatus } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function serializeVariant(variant: any) {
  return {
    variant_id: toText(variant?.variantId),
    slug: toText(variant?.slug),
    title: toText(variant?.title),
    format: toText(variant?.format),
    language: toText(variant?.language),
    channel: toText(variant?.channel),
    published: Boolean(variant?.published),
    price: variant?.price != null ? String(variant.price) : "",
    currency: toText(variant?.currency),
    assets: Array.isArray(variant?.assets)
      ? variant.assets.map((asset: any) => ({
          role: toText(asset?.role),
          file_url: toText(asset?.fileUrl),
        }))
      : [],
    products: Array.isArray(variant?.products)
      ? variant.products.map((product: any) => ({
          id: toText(product?.id),
          slug: toText(product?.slug),
          title: toText(product?.title),
          type: toText(product?.type),
          price_cents: Number(product?.priceCents || 0),
          currency: toText(product?.currency),
          active: Boolean(product?.active),
          featured: Boolean(product?.featured),
        }))
      : [],
    updated_at: variant?.updatedAt instanceof Date ? variant.updatedAt.toISOString() : toText(variant?.updatedAt),
  };
}

export async function GET(request: Request, context: { params: { projectId: string } }) {
  try {
    assertStudioApiKey(request);

    const projectId = toText(context?.params?.projectId);
    if (!projectId) {
      return NextResponse.json({ ok: false, error: "project_id_missing" }, { status: 400 });
    }

    const publications = await prisma.publication.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      include: {
        variants: {
          orderBy: { updatedAt: "desc" },
          include: {
            assets: true,
            products: true,
          },
        },
      },
    });

    const latest = publications[0] || null;

    return NextResponse.json({
      ok: true,
      intake: "studio_project_status_v1",
      project_id: projectId,
      found: publications.length > 0,
      publications_count: publications.length,
      latest_publication: latest
        ? {
            publication_id: toText(latest.publicationId),
            project_slug: toText(latest.projectSlug),
            channel: toText(latest.channel),
            language: toText(latest.language),
            status: toText(latest.status),
            source_system: toText(latest.sourceSystem),
            created_at: latest.createdAt.toISOString(),
            updated_at: latest.updatedAt.toISOString(),
            warnings: latest.warningsJson ?? null,
            errors: latest.errorsJson ?? null,
            variants: Array.isArray(latest.variants) ? latest.variants.map(serializeVariant) : [],
          }
        : null,
      publications: publications.map((publication) => ({
        publication_id: toText(publication.publicationId),
        project_slug: toText(publication.projectSlug),
        channel: toText(publication.channel),
        language: toText(publication.language),
        status: toText(publication.status),
        updated_at: publication.updatedAt.toISOString(),
        variants_count: Array.isArray(publication.variants) ? publication.variants.length : 0,
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
