import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudioApiKey } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    assertStudioApiKey(request);
    const { productId } = await params;
    const body = await request.json();

    const priceCents = Number(body?.price_cents);
    const currency = String(body?.currency || "EUR").trim().toUpperCase();

    if (!Number.isInteger(priceCents) || priceCents < 0) {
      return NextResponse.json({ ok: false, error: "invalid_price_cents" }, { status: 400 });
    }

    if (!currency) {
      return NextResponse.json({ ok: false, error: "invalid_currency" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        priceCents,
        currency,
      },
      include: {
        variant: true,
      },
    });

    await prisma.publicationVariant.update({
      where: { variantId: product.variant.variantId },
      data: {
        price: Number((priceCents / 100).toFixed(2)),
        currency,
      },
    });

    return NextResponse.json({
      ok: true,
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        type: product.type,
        active: product.active,
        featured: product.featured,
        price_cents: product.priceCents,
        currency: product.currency,
        variant_id: product.variant.variantId,
        project_id: product.variant.projectId,
        updated_at: product.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 400 }
    );
  }
}
