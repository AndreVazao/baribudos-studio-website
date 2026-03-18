import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminKey } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    assertAdminKey(request);

    const publications = await prisma.publication.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        variants: true,
        ip: true,
        series: true,
      },
    });

    return NextResponse.json({ publications });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 401 }
    );
  }
}
