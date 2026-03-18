import { NextResponse } from "next/server";
import { buildLibraryToken } from "@/lib/library";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email obrigatório." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!customer) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const token = buildLibraryToken(normalizedEmail);

    return NextResponse.json({
      ok: true,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/biblioteca?email=${encodeURIComponent(
        normalizedEmail
      )}&token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 400 }
    );
  }
      }
