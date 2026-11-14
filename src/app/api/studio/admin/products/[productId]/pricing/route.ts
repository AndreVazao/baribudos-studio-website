import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudioApiKey, asHttpErrorStatus } from "@/lib/auth";

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

    if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
      return NextResponse.json({ ok: false, error: "invalid_price_cents" }, { status: 400 });
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ ok: false, error: "invalid_currency" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: { priceCents, currency },
        include: { variant: true },
      });

      await tx.publicationVariant.update({
        where: { variantId: product.variant.variantId },
        data: {
          price: Number((priceCents / 100).toFixed(2)),
          currency,
        },
      });

      return product;
    });

    return NextResponse.json({
      ok: true,
      product: {
        id: result.id,
        slug: result.slug,
        title: result.title,
        type: result.type,
        active: result.active,
        featured: result.featured,
        price_cents: result.priceCents,
        currency: result.currency,
        variant_id: result.variant.variantId,
        project_id: result.variant.projectId,
        updated_at: result.updatedAt,
      },
    });
  } catch (error) {
    const status = asHttpErrorStatus(error, 500);
    return NextResponse.json(
      { ok: false, error: status === 500 ? "internal_error" : (error instanceof Error ? error.message : "request_failed") },
      { status }
    );
  }
}
