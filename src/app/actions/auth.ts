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

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { error: "Credenziali non valide." };
  }

  const { email, password } = validated.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { error: "Email o password errati." };
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    return { error: "Email o password errati." };
  }

  await createSession(user.id, user.role);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
