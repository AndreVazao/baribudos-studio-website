import { prisma } from "@/lib/prisma";
import type { PublicationIngestInput } from "@/lib/publication-schema";
import { inferProductType, makeVariantSlug } from "@/lib/publication-mapper";

export async function syncPublicationToCommerce(input: PublicationIngestInput) {
  const payload = input.payload;
  const variantSlug = makeVariantSlug(input);
  const priceCents = Math.round(payload.price * 100);
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

    const product = await tx.product.upsert({
      where: { slug: variant.slug },
      update: {
        title: payload.title,
        type: productType,
        priceCents,
        currency: payload.currency,
        active: true,
      },
      create: {
        publicationVariantId: variant.variantId,
        slug: variant.slug,
        title: payload.title,
        type: productType,
        priceCents,
        currency: payload.currency,
        active: true,
      },
    });

    return {
      ip,
      series,
      publication,
      variant,
      product,
    };
  });
}
