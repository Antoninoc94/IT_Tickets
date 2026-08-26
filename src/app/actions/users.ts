"use server";

import * as z from "zod";
import argon2 from "argon2";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { sendMail } from "@/lib/mail";
import { buildEmailHtml } from "@/lib/email-html";
import { getSettings } from "@/lib/settings";
import type { Role } from "@/generated/prisma/enums";

const NewUserSchema = z.object({
  firstName: z.string().trim().min(2, { error: "Il nome deve avere almeno 2 caratteri." }),
  lastName:  z.string().trim().min(2, { error: "Il cognome deve avere almeno 2 caratteri." }),
  email:     z.email({ error: "Inserisci un'email valida." }),
  password:  z.string().min(8, { error: "La password deve avere almeno 8 caratteri." }),
  role:      z.enum(["ADMIN", "IT", "USER"]),
});

export type NewUserState = { error?: string } | undefined;

export async function createUser(_state: NewUserState, formData: FormData): Promise<NewUserState> {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }

  const validated = NewUserSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName:  formData.get("lastName"),
    email:     formData.get("email"),
    password:  formData.get("password"),
    role:      formData.get("role"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const email = validated.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Esiste già un utente con questa email." };
  }

  const name = `${validated.data.firstName} ${validated.data.lastName}`;
  const passwordHash = await argon2.hash(validated.data.password);
  await prisma.user.create({
    data: {
      name,
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

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, { error: "Il nome deve avere almeno 2 caratteri." }),
  email: z.email({ error: "Inserisci un'email valida." }),
});

export type UpdateProfileState = { error?: string; success?: boolean } | undefined;

export async function updateUserProfile(
  userId: string,
  _state: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }

  const validated = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const email = validated.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    return { error: "Esiste già un utente con questa email." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: validated.data.name, email },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function unlockUserLogin(userId: string) {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") {
    throw new Error("Non autorizzato.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
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

export type DeleteUserState = { error?: string } | undefined;

export async function deleteUser(userId: string): Promise<DeleteUserState> {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }
  if (userId === current.id) {
    return { error: "Non puoi eliminare il tuo stesso account." };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return {
      error: "Impossibile eliminare: l'utente ha ticket o commenti associati. Disattivalo invece.",
    };
  }

  revalidatePath("/admin/users");
}

const ResetPasswordSchema = z.object({
  password: z.string().min(8, { error: "La password deve avere almeno 8 caratteri." }),
});

export type ResetPasswordState = { error?: string; success?: boolean } | undefined;

export async function resetUserPassword(
  userId: string,
  _state: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }

  const validated = ResetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Password non valida." };
  }

  const passwordHash = await argon2.hash(validated.data.password);
  const target = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });

  const settings = await getSettings();
  if (settings.emailEnabled) {
    const subject = `La tua password è stata reimpostata — ${settings.appName}`;
    const text = `Ciao ${target.name},\n\nUn amministratore ha reimpostato la password del tuo account ${settings.appName}.\n\nAl prossimo accesso ti verrà chiesto di impostarne una nuova.\n\nSe non ti aspettavi questa modifica, contatta subito l'IT.`;
    const html = buildEmailHtml(text, settings);
    await sendMail(target.email, subject, text, html);
  }

  revalidatePath("/admin/users");
  return { success: true };
}
