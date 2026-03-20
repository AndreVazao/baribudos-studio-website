import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminKey } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    assertAdminKey(request);

    const users = await request.json();

    if (!Array.isArray(users)) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const created: string[] = [];

    for (const user of users) {
      const email = String(user.email).toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email } });

      if (existing) continue;

      await prisma.user.create({
        data: {
          name: user.name || null,
          email,
          passwordHash: await hashPassword(String(user.password)),
          role: user.role || "ADMIN",
          isActive: true,
        },
      });

      created.push(email);
    }

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno." },
      { status: 400 }
    );
  }
    }
