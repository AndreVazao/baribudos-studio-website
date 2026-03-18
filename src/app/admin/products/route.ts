import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminKey } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    assertAdminKey(request);

    const products = await prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        variant: true,
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 401 }
    );
  }
}
