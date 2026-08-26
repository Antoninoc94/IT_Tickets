"use server";

import * as z from "zod";
import argon2 from "argon2";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  email: z.email({ error: "Inserisci un'email valida." }),
  password: z.string().min(1, { error: "Inserisci la password." }),
});

export type LoginState =
  | {
      error?: string;
    }
  | undefined;

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { error: "Credenziali non valide." };
  }

  const { password } = validated.data;
  const email = validated.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { error: "Email o password errati." };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: `Troppi tentativi falliti. Riprova tra ${minutesLeft} minut${minutesLeft === 1 ? "o" : "i"}.` };
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedOut = attempts >= MAX_LOGIN_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lockedOut ? 0 : attempts,
        lockedUntil: lockedOut ? new Date(Date.now() + LOGIN_LOCKOUT_MS) : null,
      },
    });
    return { error: "Email o password errati." };
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  if (!user.emailVerifiedAt) {
    redirect(`/register/verify?email=${encodeURIComponent(user.email)}`);
  }

  await createSession(user.id, user.role);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
