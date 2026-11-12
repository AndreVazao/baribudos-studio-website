import { NextResponse } from "next/server";
import { assertStudioApiKey, asHttpErrorStatus } from "@/lib/auth";
import { publicationIngestSchema } from "@/lib/publication-schema";
import { verifyPublicationChecksum } from "@/lib/publication-checksum";
import { syncPublicationToCommerce } from "@/lib/sync-commerce";

export async function POST(request: Request) {
  try {
    assertStudioApiKey(request);

    const rawBody = await request.text();
    if (!verifyPublicationChecksum(rawBody)) {
      throw new Error("publication_checksum_mismatch");
    }
    const json = JSON.parse(rawBody);
    const input = publicationIngestSchema.parse(json);
    const result = await syncPublicationToCommerce(input);

    return NextResponse.json({
      ok: true,
      intake: "studio_publish_v1",
      schema_version: (json && typeof json === "object" && "schema_version" in json)
        ? String((json as { schema_version?: unknown }).schema_version || "website_ingest_v1")
        : "website_ingest_v1",
      publication_id: input.publication_id,
      variant_id: input.variant_id,
      saved: {
        publication: result.publication.id,
        variant: result.variant.id,
        product: result.product.id,
      },
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
