import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminKey } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    assertAdminKey(request);

    const orders = await prisma.checkout.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 401 }
    );
  }
}
