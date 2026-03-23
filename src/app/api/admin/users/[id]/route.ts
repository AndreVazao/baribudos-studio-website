import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-session";
import { hashPassword } from "@/lib/password";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireManager();
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, any> = {};

    if (typeof body.name === "string") {
      data.name = body.name.trim() || null;
    }

    if (typeof body.role === "string") {
      const allowedRoles = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CUSTOMER"];
      if (!allowedRoles.includes(body.role)) {
        return NextResponse.json(
          { ok: false, error: "Role inválido." },
          { status: 400 }
        );
      }

      if (currentUser.role !== "SUPER_ADMIN" && body.role === "SUPER_ADMIN") {
        return NextResponse.json(
          { ok: false, error: "Só SUPER_ADMIN pode atribuir SUPER_ADMIN." },
          { status: 403 }
        );
      }

      data.role = body.role;
    }

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (typeof body.password === "string" && body.password.trim()) {
      data.passwordHash = await hashPassword(body.password.trim());
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 403 }
    );
  }
}
