import { prisma } from "@/lib/prisma";

export async function getPublicVariantBySlug(slug: string) {
  return prisma.publicationVariant.findFirst({
    where: { slug, published: true },
    include: {
      assets: true,
      products: true,
    },
  });
}

export async function getPublicVariantByVariantId(variantId: string) {
  return prisma.publicationVariant.findUnique({
    where: { variantId },
    include: {
      assets: true,
      products: true,
      publication: true,
    },
  });
}
