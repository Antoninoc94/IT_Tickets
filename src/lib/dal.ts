import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, deleteSession, getSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

export const verifySession = cache(async () => {
  const token = await getSessionCookie();
  const session = await decrypt(token);

  if (!session?.userId) {
    redirect("/login");
  }

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, active: true, mustChangePassword: true },
  });

  if (!user || !user.active) {
    await deleteSession();
    redirect("/login");
  }

  return user;
});

export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    redirect("/dashboard");
  }
}
