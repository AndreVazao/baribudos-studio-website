import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();

    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.redirect(
        new URL("/admin/account?error=missing-fields", request.url)
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.redirect(
        new URL("/admin/account?error=password-mismatch", request.url)
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.redirect(
        new URL("/admin/account?error=password-too-short", request.url)
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.redirect(
        new URL("/login?error=user-not-found", request.url)
      );
    }

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);

    if (!valid) {
      return NextResponse.redirect(
        new URL("/admin/account?error=invalid-current-password", request.url)
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        passwordHash,
      },
    });

    return NextResponse.redirect(
      new URL("/admin/account?success=password-updated", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=unauthorized", request.url)
    );
  }
}
