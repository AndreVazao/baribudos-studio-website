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

    const visualSetId = normalizeText(body?.id || body?.visual_set_id);
    const sagaSlug = normalizeText(body?.saga_slug).toLowerCase();
    const displayName = normalizeText(body?.display_name);

    if (!visualSetId) {
      return NextResponse.json({ ok: false, error: "visual_set_id_missing" }, { status: 400 });
    }
    if (!sagaSlug) {
      return NextResponse.json({ ok: false, error: "saga_slug_missing" }, { status: 400 });
    }
    if (!displayName) {
      return NextResponse.json({ ok: false, error: "display_name_missing" }, { status: 400 });
    }

    const payloadJson = {
      id: visualSetId,
      saga_slug: sagaSlug,
      display_name: displayName,
      active: Boolean(body?.active),
      version: Number(body?.version || 1),
      source_of_truth: normalizeText(body?.source_of_truth) || "studio",
      slots: body?.slots && typeof body.slots === "object" ? body.slots : {},
      rotation_policy:
        body?.rotation_policy && typeof body.rotation_policy === "object"
          ? body.rotation_policy
          : {},
    };

    const item = await prisma.sagaVisualSet.upsert({
      where: { visualSetId },
      update: {
        sagaSlug,
        displayName,
        active: Boolean(body?.active),
        version: Number(body?.version || 1),
        sourceSystem: normalizeText(body?.source_of_truth) || "studio",
        payloadJson,
      },
      create: {
        visualSetId,
        sagaSlug,
        displayName,
        active: Boolean(body?.active),
        version: Number(body?.version || 1),
        sourceSystem: normalizeText(body?.source_of_truth) || "studio",
        payloadJson,
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 400 }
    );
  }
}
