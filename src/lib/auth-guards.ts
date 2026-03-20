import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";

export async function requirePageUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePageAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!["SUPER_ADMIN", "ADMIN", "EDITOR"].includes(user.role)) {
    redirect("/");
  }

  return user;
}

export async function requirePageManager() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    redirect("/");
  }

  return user;
}
