"use server";

import * as z from "zod";
import argon2 from "argon2";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import type { Role } from "@/generated/prisma/enums";

const NewUserSchema = z.object({
  name: z.string().trim().min(2, { error: "Il nome deve avere almeno 2 caratteri." }),
  email: z.email({ error: "Inserisci un'email valida." }),
  password: z.string().min(8, { error: "La password deve avere almeno 8 caratteri." }),
  role: z.enum(["ADMIN", "IT", "USER"]),
});

export type NewUserState = { error?: string } | undefined;

export async function createUser(_state: NewUserState, formData: FormData): Promise<NewUserState> {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }

  const validated = NewUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const email = validated.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Esiste già un utente con questa email." };
  }

  const passwordHash = await argon2.hash(validated.data.password);
  await prisma.user.create({
    data: {
      name: validated.data.name,
      email,
      role: validated.data.role,
      passwordHash,
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
    },
  });

  revalidatePath("/admin/users");
}

export async function updateUserRole(userId: string, role: Role) {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") {
    throw new Error("Non autorizzato.");
  }
  if (userId === current.id) {
    throw new Error("Non puoi modificare il tuo stesso ruolo.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/users");
}

export async function toggleUserActive(userId: string) {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") {
    throw new Error("Non autorizzato.");
  }
  if (userId === current.id) {
    throw new Error("Non puoi disattivare il tuo stesso account.");
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  await prisma.user.update({
    where: { id: userId },
    data: { active: !target.active },
  });

  revalidatePath("/admin/users");
}
