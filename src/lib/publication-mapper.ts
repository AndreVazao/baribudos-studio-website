import { slugify } from "@/lib/slug";
import type { PublicationIngestInput } from "@/lib/publication-schema";

export function inferProductType(formats: string[]) {
  if (formats.includes("bundle")) return "BUNDLE";
  if (formats.includes("audiobook")) return "AUDIOBOOK";
  if (formats.includes("video")) return "VIDEO";
  return "EBOOK";
}

export function makeVariantSlug(input: PublicationIngestInput) {
  return slugify(
    `${input.payload.ip_slug}-${input.payload.title}-${input.payload.language}-${input.variant_id}`
  );
}
