import { z } from "zod";
import { hasAtMostTwoDecimalPlaces, MAX_PRICE_MINOR_UNITS } from "@/lib/publication-price";
import { isPublicHttpsAssetUrl } from "@/lib/publication-asset-url.mjs";

const publicAssetUrlSchema = z.string().url().refine(isPublicHttpsAssetUrl, {
  message: "asset_url_must_be_public_https_url",
});

export const websitePayloadSchema = z.object({
  project_id: z.string(),
  project_slug: z.string(),
  ip_slug: z.string(),
  ip_name: z.string(),
  series_name: z.string().optional().default(""),
  language: z.string(),
  title: z.string(),
  subtitle: z.string().optional().default(""),
  description: z.string(),
  short_description: z.string().optional().default(""),
  formats: z.array(z.string()).default([]),
  // Product.priceCents is a PostgreSQL Int; reject values that cannot be
  // represented safely in minor units before the transaction starts.
  price: z.number().finite().min(0).max(MAX_PRICE_MINOR_UNITS / 100).refine(hasAtMostTwoDecimalPlaces, {
    message: "price_must_have_at_most_two_decimal_places",
  }),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("EUR"),
  channel: z.string(),
  assets: z.object({
    // Studio currently sends an empty string when no cover is selected.
    // Normalize that sentinel to an absent asset while still rejecting relative/local paths.
    cover: z.preprocess((value) => value === "" ? undefined : value, publicAssetUrlSchema.optional()),
    logos: z.array(publicAssetUrlSchema).optional().default([]),
    gallery: z.array(publicAssetUrlSchema).optional().default([]),
    sample_pages: z.array(publicAssetUrlSchema).optional().default([]),
    audiobook_preview: publicAssetUrlSchema.optional().nullable(),
    video_trailer: publicAssetUrlSchema.optional().nullable(),
    downloadable_files: z.array(publicAssetUrlSchema).optional().default([]),
  }),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()).default([]),
    canonical_url: z.string().url().optional().or(z.literal("")),
    og_image: publicAssetUrlSchema.optional().or(z.literal("")),
  }),
  characters: z.array(z.string()).optional().default([]),
  themes: z.array(z.string()).optional().default([]),
  values: z.array(z.string()).optional().default([]),
  authors: z.array(z.string()).optional().default([]),
  badges: z.array(z.string()).optional().default([]),
  buy_links: z.array(z.any()).optional().default([]),
});

export const publicationIngestSchema = z.object({
  ok: z.boolean().default(true),
  schema_version: z.literal("website_ingest_v1"),
  publication_id: z.string().min(1),
  variant_id: z.string().min(1),
  project_id: z.string().min(1),
  project_version: z.string().datetime({ offset: true }),
  published_at: z.string().datetime({ offset: true }),
  checksum: z.string().regex(/^[a-fA-F0-9]{64}$/),
  payload: websitePayloadSchema,
  related_variants: z.array(z.any()),
  related_projects: z.array(z.any()),
  asset_manifest: z.any().optional().nullable(),
  branding_pack: z.any().optional().nullable(),
  marketplace_visuals: z.any().optional().nullable(),
}).superRefine((input, context) => {
  if (input.project_id !== input.payload.project_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["project_id"],
      message: "envelope_project_id_must_match_payload_project_id",
    });
  }
});

export type PublicationIngestInput = z.infer<typeof publicationIngestSchema>;
