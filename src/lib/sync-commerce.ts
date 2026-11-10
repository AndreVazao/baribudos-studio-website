import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPublicationVersionCanReplace } from "@/lib/publication-version";
import type { PublicationIngestInput } from "@/lib/publication-schema";
import { inferProductType, makeVariantSlug } from "@/lib/publication-mapper";
import { toPriceCents } from "@/lib/publication-price";

export async function syncPublicationToCommerce(input: PublicationIngestInput) {
  const payload = input.payload;
  const variantSlug = makeVariantSlug(input);
  const priceCents = toPriceCents(payload.price);
  const productType = inferProductType(payload.formats) as any;
  const seriesSlug = payload.series_name
    ? `${payload.ip_slug}-${payload.series_name.toLowerCase().replace(/\s+/g, "-")}`
    : null;

  const assetUrls = [
    payload.assets.cover ? { role: "COVER", fileUrl: payload.assets.cover } : null,
    ...(payload.assets.gallery || []).map((url) => ({ role: "GALLERY", fileUrl: url })),
    ...(payload.assets.sample_pages || []).map((url) => ({ role: "SAMPLE_PAGE", fileUrl: url })),
    ...(payload.assets.downloadable_files || []).map((url) => ({ role: "DOWNLOADABLE_FILE", fileUrl: url })),
    payload.assets.audiobook_preview
      ? { role: "AUDIOBOOK_PREVIEW", fileUrl: payload.assets.audiobook_preview }
      : null,
    payload.assets.video_trailer
      ? { role: "VIDEO_TRAILER", fileUrl: payload.assets.video_trailer }
      : null,
  ].filter(Boolean) as Array<{ role: string; fileUrl: string }>;

  // All catalog records and their assets are committed together. Replaying an
  // envelope replaces the variant's asset snapshot instead of appending duplicates.
  return prisma.$transaction(async (tx) => {
    const existingVariant = await tx.publicationVariant.findUnique({
      where: { variantId: input.variant_id },
      select: { payloadJson: true },
    });
    const storedPayload = existingVariant?.payloadJson;
    const storedStudioMeta =
      storedPayload !== null &&
      typeof storedPayload === "object" &&
      !Array.isArray(storedPayload)
        ? (storedPayload as Record<string, unknown>)._studio as
            | { project_version?: unknown; checksum?: unknown }
            | undefined
        : undefined;

    // Reject delayed/out-of-order deliveries before touching any catalog row.
    assertPublicationVersionCanReplace(storedStudioMeta, {
      project_version: input.project_version,
      checksum: input.checksum,
    });

    const ip = await tx.intellectualProperty.upsert({
      where: { slug: payload.ip_slug },
      update: { name: payload.ip_name },
      create: {
        slug: payload.ip_slug,
        name: payload.ip_name,
      },
    });

    const series = seriesSlug
      ? await tx.series.upsert({
          where: { slug: seriesSlug },
          update: { name: payload.series_name },
          create: {
            ipId: ip.id,
            slug: seriesSlug,
            name: payload.series_name,
          },
        })
      : null;

    const publication = await tx.publication.upsert({
      where: { publicationId: input.publication_id },
      update: {
        projectId: payload.project_id,
        projectSlug: payload.project_slug,
        channel: payload.channel,
        language: payload.language,
        status: "published",
        payloadJson: input,
        ipId: ip.id,
        seriesId: series?.id ?? null,
        warningsJson: {
          schema_version: input.schema_version,
          checksum: input.checksum,
          project_version: input.project_version,
          published_at: input.published_at,
        },
      },
      create: {
        publicationId: input.publication_id,
        projectId: payload.project_id,
        projectSlug: payload.project_slug,
        channel: payload.channel,
        language: payload.language,
        sourceSystem: "Baribudos Studio",
        status: "published",
        payloadJson: input,
        warningsJson: {
          schema_version: input.schema_version,
          checksum: input.checksum,
          project_version: input.project_version,
          published_at: input.published_at,
        },
        ipId: ip.id,
        seriesId: series?.id ?? null,
      },
    });

    const studioMeta = {
      schema_version: input.schema_version,
      checksum: input.checksum,
      project_version: input.project_version,
      published_at: input.published_at,
    };
    const variantPayload = {
      ...payload,
      _studio: studioMeta,
    };

    const variant = await tx.publicationVariant.upsert({
      where: { variantId: input.variant_id },
      update: {
        projectId: payload.project_id,
        projectSlug: payload.project_slug,
        channel: payload.channel,
        language: payload.language,
        format: payload.formats[0] || "ebook",
        slug: variantSlug,
        title: payload.title,
        subtitle: payload.subtitle,
        description: payload.description,
        shortDescription: payload.short_description,
        price: payload.price,
        currency: payload.currency,
        payloadJson: variantPayload,
        published: true,
        publicationIdRef: publication.publicationId,
      },
      create: {
        publicationIdRef: publication.publicationId,
        variantId: input.variant_id,
        projectId: payload.project_id,
        projectSlug: payload.project_slug,
        channel: payload.channel,
        language: payload.language,
        format: payload.formats[0] || "ebook",
        slug: variantSlug,
        title: payload.title,
        subtitle: payload.subtitle,
        description: payload.description,
        shortDescription: payload.short_description,
        price: payload.price,
        currency: payload.currency,
        payloadJson: variantPayload,
        published: true,
      },
    });

    // Replace the complete asset snapshot, including removals, in this transaction.
    await tx.publicationAsset.deleteMany({
      where: { variantIdRef: variant.variantId },
    });

    if (assetUrls.length > 0) {
      await tx.publicationAsset.createMany({
        data: assetUrls.map((asset) => ({
          variantIdRef: variant.variantId,
          role: asset.role,
          fileUrl: asset.fileUrl,
        })),
      });
    }

    const existingProducts = await tx.product.findMany({
      where: { publicationVariantId: variant.variantId },
      orderBy: { createdAt: "asc" },
    });
    const productBySlug = await tx.product.findUnique({
      where: { slug: variant.slug },
    });

    if (productBySlug && productBySlug.publicationVariantId !== variant.variantId) {
      throw new Error("O slug comercial já pertence a outra variante.");
    }

    // Keep one stable commerce product per variant when editorial changes alter
    // the generated slug. Older duplicates are retained for historical library
    // references but are made inactive so they cannot continue being sold.
    const primaryProduct =
      existingProducts.find((item) => item.slug === variant.slug) ??
      existingProducts[0] ??
      productBySlug;
    const productData = {
      publicationVariantId: variant.variantId,
      slug: variant.slug,
      title: payload.title,
      type: productType,
      priceCents,
      currency: payload.currency,
      active: true,
    };

    const product = primaryProduct
      ? await tx.product.update({
          where: { id: primaryProduct.id },
          data: productData,
        })
      : await tx.product.create({
          data: productData,
        });

    const duplicateProductIds = existingProducts
      .filter((item) => item.id !== product.id)
      .map((item) => item.id);

    if (duplicateProductIds.length > 0) {
      await tx.product.updateMany({
        where: { id: { in: duplicateProductIds } },
        data: { active: false },
      });
    }

    return {
      ip,
      series,
      publication,
      variant,
      product,
    };
  }, {
    // Concurrent deliveries must not both pass the version check and commit
    // out of order. PostgreSQL aborts one serializable transaction on conflict.
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
