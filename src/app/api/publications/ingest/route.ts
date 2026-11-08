import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { assertStudioApiKey, asHttpErrorStatus } from "@/lib/auth";
import { publicationIngestSchema } from "@/lib/publication-schema";
import { syncPublicationToCommerce } from "@/lib/sync-commerce";

export async function POST(request: Request) {
  try {
    assertStudioApiKey(request);

    const json = await request.json();
    const input = publicationIngestSchema.parse(json);
    const result = await syncPublicationToCommerce(input);

    return NextResponse.json({
      ok: true,
      publication_id: input.publication_id,
      variant_id: input.variant_id,
      saved: {
        publication: result.publication.id,
        variant: result.variant.id,
        product: result.product.id,
      },
    });
  } catch (error) {
    const status = error instanceof ZodError || error instanceof SyntaxError
      ? 400
      : asHttpErrorStatus(error, 500);
    return NextResponse.json(
      {
        ok: false,
        error: status >= 500 ? "internal_error" : (error instanceof Error ? error.message : "request_failed"),
      },
      { status }
    );
  }
}
