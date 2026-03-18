import { NextResponse } from "next/server";
import { getPublicVariantByVariantId } from "@/lib/publication-query";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ variantId: string }> }
) {
  const { variantId } = await params;
  const variant = await getPublicVariantByVariantId(variantId);

  if (!variant) {
    return NextResponse.json({ ok: false, error: "Variante não encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    publication_id: variant.publication.publicationId,
    variant_id: variant.variantId,
    payload: variant.payloadJson,
    related_variants: [],
    related_projects: [],
  });
}
