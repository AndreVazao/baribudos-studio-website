import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-session";
import { hashPassword } from "@/lib/password";

export async function GET() {
  try {
    await requireManager();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            library: true,
            checkouts: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 403 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireManager();

    const body = await request.json();
    const name = String(body.name || "").trim() || null;
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const role = String(body.role || "CUSTOMER");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email e password são obrigatórios." },
        { status: 400 }
      );
    }

    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CUSTOMER"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { ok: false, error: "Role inválido." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Já existe utilizador com esse email." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role as any,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 403 }
    );
  }
}
