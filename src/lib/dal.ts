import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

const INACTIVITY_MS =
  parseInt(process.env.SESSION_INACTIVITY_HOURS ?? "8", 10) * 60 * 60 * 1000;

export const verifySession = cache(async () => {
  const token = await getSessionCookie();
  const session = await decrypt(token);

  if (!session?.userId) {
    redirect("/login");
  }

  // Secondary inactivity guard for requests that bypass proxy (e.g. direct API calls)
  if (session.lastActiveAt !== undefined && Date.now() - session.lastActiveAt > INACTIVITY_MS) {
    redirect("/api/auth/signout");
  }

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      mustChangePassword: true,
      emailVerifiedAt: true,
    },
  });

  if (!user || !user.active) {
    redirect("/api/auth/signout");
  }

  return user;
});

/** Returns the session payload without redirecting — null if missing or invalid. */
export const peekSession = cache(async () => {
  const token = await getSessionCookie();
  return decrypt(token);
});

export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    redirect("/dashboard");
  }
}
