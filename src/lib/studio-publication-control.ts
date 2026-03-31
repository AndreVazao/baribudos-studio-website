import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getStudioPublicationStatus(publicationId: string) {
  const publication = await prisma.publication.findUnique({
    where: { publicationId },
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

  if (!publication) {
    return null;
  }

  const variants = publication.variants.map((variant) => ({
    variant_id: variant.variantId,
    slug: variant.slug,
    language: variant.language,
    format: variant.format,
    published: variant.published,
    studio_meta: (variant.payloadJson as any)?._studio || {},
    products: variant.products.map((product) => ({
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
    studio_meta: publication.warningsJson || {},
    variants,
    updated_at: publication.updatedAt,
  };
}

export async function unpublishStudioPublication(publicationId: string) {
  const publication = await prisma.publication.findUnique({
    where: { publicationId },
    include: {
      variants: {
        include: {
          products: true,
        },
      },
    },
  });

  if (!publication) {
    return null;
  }

  await prisma.publication.update({
    where: { publicationId },
    data: {
      status: "unpublished",
      updatedAt: new Date(),
    },
  });

  for (const variant of publication.variants) {
    await prisma.publicationVariant.update({
      where: { variantId: variant.variantId },
      data: {
        published: false,
        updatedAt: new Date(),
      },
    });

    for (const product of variant.products) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          active: false,
          featured: false,
          updatedAt: new Date(),
        },
      });
    }
  }

  try {
    revalidatePath("/");
    revalidatePath("/loja");
    revalidatePath("/ips");
  } catch {}

  return getStudioPublicationStatus(publicationId);
}

export async function revalidateStudioPublication(publicationId: string) {
  const publication = await prisma.publication.findUnique({
    where: { publicationId },
    include: { variants: true },
  });

  if (!publication) {
    return null;
  }

  try {
    revalidatePath("/");
    revalidatePath("/loja");
    revalidatePath(`/ip/${publication.ipId}`);
    for (const variant of publication.variants) {
      if (variant.slug) {
        revalidatePath(`/loja/${variant.slug}`);
      }
    }
  } catch {}

  return {
    ok: true,
    publication_id: publication.publicationId,
    revalidated_at: new Date().toISOString(),
  };
}
