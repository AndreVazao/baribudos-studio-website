import { NextResponse } from "next/server";
import { assertStudioApiKey } from "@/lib/auth";
import { revalidateStudioPublication } from "@/lib/studio-publication-control";

export async function POST(request: Request, { params }: { params: { publicationId: string } }) {
  try {
    assertStudioApiKey(request);
    const result = await revalidateStudioPublication(params.publicationId);
    if (!result) {
      return NextResponse.json({ ok: false, error: "publication_not_found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro interno." }, { status: 400 });
  }
}
