import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminKey } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    assertAdminKey(request);

    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        library: true,
        checkouts: true,
      },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 401 }
    );
  }
}
