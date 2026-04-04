import { prisma } from "@/lib/prisma";

type StudioMeta = Record<string, unknown>;

function asRecord(value: unknown): StudioMeta {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as StudioMeta)
    : {};
}

function buildPublicationStatus(publication: any) {
  const variants = publication.variants.map((variant: any) => ({
    variant_id: variant.variantId,
    slug: variant.slug,
    language: variant.language,
    format: variant.format,
    published: variant.published,
    studio_meta: asRecord(asRecord(variant.payloadJson)._studio),
    products: variant.products.map((product: any) => ({
      id: product.id,
      slug: product.slug,
      active: product.active,
      featured: product.featured,
      updated_at: product.updatedAt,
    })),
    assets_count: variant.assets.length,
    updated_at: variant.updatedAt,
  }));

  return {
    publication_id: publication.publicationId,
    project_id: publication.projectId,
    project_slug: publication.projectSlug,
    channel: publication.channel,
    language: publication.language,
    status: publication.status,
    source_system: publication.sourceSystem,
    ip: {
      slug: publication.ip.slug,
      name: publication.ip.name,
    },
    series: publication.series ? { slug: publication.series.slug, name: publication.series.name } : null,
    studio_meta: asRecord(publication.warningsJson),
    variants,
    updated_at: publication.updatedAt,
  };
}

export async function getStudioSummary() {
  const [publications, variants, products, activeProducts] = await Promise.all([
    prisma.publication.count(),
    prisma.publicationVariant.count(),
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
  ]);

  return {
    publications,
    variants,
    products,
    active_products: activeProducts,
    checked_at: new Date().toISOString(),
  };
}

export async function listStudioPublications(limit = 25, status = "") {
  const normalizedLimit = Math.max(1, Math.min(Number(limit || 25), 100));
  const normalizedStatus = String(status || "").trim().toLowerCase();

  const publications = await prisma.publication.findMany({
    where: normalizedStatus ? { status: normalizedStatus } : undefined,
    orderBy: [{ updatedAt: "desc" }],
    take: normalizedLimit,
    include: {
      ip: true,
      series: true,
      variants: {
        include: {
          products: true,
          assets: true,
        },
      },
    },
  });

  return {
    ok: true,
    checked_at: new Date().toISOString(),
    count: publications.length,
    filters: {
      limit: normalizedLimit,
      status: normalizedStatus || "all",
    },
    items: publications.map((publication) => buildPublicationStatus(publication)),
  };
}

export async function getStudioReconcileReport(limit = 25) {
  const normalizedLimit = Math.max(1, Math.min(Number(limit || 25), 100));

  const publications = await prisma.publication.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: normalizedLimit,
    include: {
      ip: true,
      series: true,
      variants: {
        include: {
          products: true,
          assets: true,
        },
      },
    },
  });

  const items = publications.map((publication) => {
    const status = buildPublicationStatus(publication);
    const publicationMeta = asRecord(status.studio_meta);
    const publicationChecksum = String(publicationMeta.checksum || "").trim();
    const publicationProjectVersion = String(publicationMeta.project_version || "").trim();

    const variantsPublishedCount = status.variants.filter((variant: any) => Boolean(variant.published)).length;
    const activeProductsCount = status.variants.reduce(
      (total: number, variant: any) => total + variant.products.filter((product: any) => Boolean(product.active)).length,
      0,
    );

    const reasons: string[] = [];

    if (status.status === "published" && variantsPublishedCount === 0) {
      reasons.push("published_without_published_variants");
    }

    if (status.status === "published" && activeProductsCount === 0) {
      reasons.push("published_without_active_products");
    }

    if (status.status !== "published" && activeProductsCount > 0) {
      reasons.push("inactive_publication_with_active_products");
    }

    const variantChecksums = status.variants
      .map((variant: any) => String(asRecord(variant.studio_meta).checksum || "").trim())
      .filter(Boolean);

    const variantProjectVersions = status.variants
      .map((variant: any) => String(asRecord(variant.studio_meta).project_version || "").trim())
      .filter(Boolean);

    if (publicationChecksum && variantChecksums.some((value: string) => value !== publicationChecksum)) {
      reasons.push("variant_checksum_mismatch");
    }

    if (publicationProjectVersion && variantProjectVersions.some((value: string) => value !== publicationProjectVersion)) {
      reasons.push("variant_project_version_mismatch");
    }

    return {
      publication_id: status.publication_id,
      project_id: status.project_id,
      project_slug: status.project_slug,
      status: status.status,
      divergence_ok: reasons.length === 0,
      reasons,
      materialization: {
        variants_total: status.variants.length,
        variants_published: variantsPublishedCount,
        active_products: activeProductsCount,
      },
      studio_meta: publicationMeta,
      updated_at: status.updated_at,
    };
  });

  return {
    ok: true,
    checked_at: new Date().toISOString(),
    count: items.length,
    healthy_count: items.filter((item) => item.divergence_ok).length,
    divergence_count: items.filter((item) => !item.divergence_ok).length,
    items,
  };
}
