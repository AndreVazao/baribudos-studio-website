import { prisma } from "@/lib/prisma";
import type { PublicationIngestInput } from "@/lib/publication-schema";
import { inferProductType, makeVariantSlug } from "@/lib/publication-mapper";

export async function syncPublicationToCommerce(input: PublicationIngestInput) {
  const payload = input.payload;

  const ip = await prisma.intellectualProperty.upsert({
    where: { slug: payload.ip_slug },
    update: {
      name: payload.ip_name,
    },
    create: {
      slug: payload.ip_slug,
      name: payload.ip_name,
    },
  });

  const series = payload.series_name
    ? await prisma.series.upsert({
        where: { slug: `${payload.ip_slug}-${payload.series_name.toLowerCase().replace(/\s+/g, "-")}` },
        update: { name: payload.series_name },
        create: {
          ipId: ip.id,
          slug: `${payload.ip_slug}-${payload.series_name.toLowerCase().replace(/\s+/g, "-")}`,
          name: payload.series_name,
        },
      })
    : null;

  const publication = await prisma.publication.upsert({
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
      ipId: ip.id,
      seriesId: series?.id ?? null,
    },
  });

  const variantSlug = makeVariantSlug(input);

  const variant = await prisma.publicationVariant.upsert({
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
      payloadJson: payload,
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
      payloadJson: payload,
      published: true,
    },
  });

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

  for (const asset of assetUrls) {
    await prisma.publicationAsset.create({
      data: {
        variantIdRef: variant.variantId,
        role: asset.role,
        fileUrl: asset.fileUrl,
      },
    }).catch(() => null);
  }

  const priceCents = Math.round(payload.price * 100);

  const product = await prisma.product.upsert({
    where: { slug: variant.slug },
    update: {
      title: payload.title,
      type: inferProductType(payload.formats) as any,
      priceCents,
      currency: payload.currency,
      active: true,
    },
    create: {
      publicationVariantId: variant.variantId,
      slug: variant.slug,
      title: payload.title,
      type: inferProductType(payload.formats) as any,
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
}
