import { z } from "zod";

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
  price: z.number(),
  currency: z.string().default("EUR"),
  channel: z.string(),
  assets: z.object({
    cover: z.string().url().optional(),
    logos: z.array(z.string().url()).optional().default([]),
    gallery: z.array(z.string().url()).optional().default([]),
    sample_pages: z.array(z.string().url()).optional().default([]),
    audiobook_preview: z.string().url().optional().nullable(),
    video_trailer: z.string().url().optional().nullable(),
    downloadable_files: z.array(z.string().url()).optional().default([]),
  }),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()).default([]),
    canonical_url: z.string().url().optional().or(z.literal("")),
    og_image: z.string().url().optional().or(z.literal("")),
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
  schema_version: z.string().optional().default("website_ingest_v1"),
  publication_id: z.string(),
  variant_id: z.string(),
  project_version: z.string().optional().default(""),
  published_at: z.string().optional().default(""),
  checksum: z.string().optional().default(""),
  payload: websitePayloadSchema,
  related_variants: z.array(z.any()).optional().default([]),
  related_projects: z.array(z.any()).optional().default([]),
  asset_manifest: z.any().optional().nullable(),
  branding_pack: z.any().optional().nullable(),
  marketplace_visuals: z.any().optional().nullable(),
});

export type PublicationIngestInput = z.infer<typeof publicationIngestSchema>;
