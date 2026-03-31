import { NextResponse } from "next/server";
import { assertStudioApiKey } from "@/lib/auth";
import { unpublishStudioPublication } from "@/lib/studio-publication-control";

export async function POST(request: Request, { params }: { params: { publicationId: string } }) {
  try {
    assertStudioApiKey(request);
    const status = await unpublishStudioPublication(params.publicationId);
    if (!status) {
      return NextResponse.json({ ok: false, error: "publication_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro interno." }, { status: 400 });
  }
}
