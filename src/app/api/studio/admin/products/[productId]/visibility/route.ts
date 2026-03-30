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

    const data: { active?: boolean; featured?: boolean } = {};
    if (typeof body?.active === "boolean") data.active = body.active;
    if (typeof body?.featured === "boolean") data.featured = body.featured;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "no_visibility_changes" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data,
      include: {
        variant: true,
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
