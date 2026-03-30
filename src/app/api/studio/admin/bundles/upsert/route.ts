import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudioApiKey } from "@/lib/auth";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: Request) {
  try {
    assertStudioApiKey(request);
    const body = await request.json();

    const groupId = normalizeText(body?.group_id || body?.id);
    const slug = normalizeText(body?.slug);
    const name = normalizeText(body?.name);

    if (!groupId) {
      return NextResponse.json({ ok: false, error: "bundle_group_id_missing" }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ ok: false, error: "bundle_slug_missing" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ ok: false, error: "bundle_name_missing" }, { status: 400 });
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    const payloadJson = {
      source: "studio",
      raw: body,
    };

    const bundle = await prisma.bundleGroup.upsert({
      where: { groupId },
      update: {
        slug,
        name,
        description: normalizeText(body?.description) || null,
        groupType: normalizeText(body?.group_type) || "bundle",
        priceCents: Number(body?.price_cents || 0),
        currency: normalizeText(body?.currency) || "EUR",
        active: Boolean(body?.active),
        featured: Boolean(body?.featured),
        sourceSystem: "studio",
        payloadJson,
      },
      create: {
        groupId,
        slug,
        name,
        description: normalizeText(body?.description) || null,
        groupType: normalizeText(body?.group_type) || "bundle",
        priceCents: Number(body?.price_cents || 0),
        currency: normalizeText(body?.currency) || "EUR",
        active: Boolean(body?.active),
        featured: Boolean(body?.featured),
        sourceSystem: "studio",
        payloadJson,
      },
    });

    await prisma.bundleGroupItem.deleteMany({
      where: { bundleIdRef: groupId },
    });

    if (items.length > 0) {
      await prisma.bundleGroupItem.createMany({
        data: items.map((item: any, index: number) => ({
          bundleIdRef: groupId,
          productId: normalizeText(item?.product_id) || null,
          productSlug: normalizeText(item?.slug) || null,
          title: normalizeText(item?.title) || normalizeText(item?.slug) || `item-${index + 1}`,
          type: normalizeText(item?.type) || null,
          currency: normalizeText(item?.currency) || "EUR",
          priceCents: Number(item?.price_cents || 0),
          position: Number.isFinite(Number(item?.position)) ? Number(item.position) : index,
        })),
      });
    }

    const fresh = await prisma.bundleGroup.findUnique({
      where: { groupId },
      include: {
        items: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      bundle: fresh,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 400 }
    );
  }
}
