"use server";

import * as z from "zod";
import argon2 from "argon2";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Inserisci la password attuale." }),
    newPassword: z.string().min(8, { error: "La nuova password deve avere almeno 8 caratteri." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Le password non coincidono.",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { error?: string; success?: boolean } | undefined;

export async function changePassword(_state: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await getCurrentUser();

  const validated = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await argon2.verify(fullUser.passwordHash, validated.data.currentPassword);
  if (!valid) {
    return { error: "Password attuale non corretta." };
  }

  const passwordHash = await argon2.hash(validated.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  redirect("/dashboard");
}

export async function changePasswordSelf(_state: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await getCurrentUser();

  const validated = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await argon2.verify(fullUser.passwordHash, validated.data.currentPassword);
  if (!valid) {
    return { error: "Password attuale non corretta." };
  }

  const passwordHash = await argon2.hash(validated.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Update profile (name + email)
// ---------------------------------------------------------------------------

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, { error: "Il nome deve avere almeno 2 caratteri." }),
  email: z.email({ error: "Inserisci un'email valida." }),
});

export type UpdateProfileState = { error?: string; success?: boolean } | undefined;

export async function updateProfile(_state: UpdateProfileState, formData: FormData): Promise<UpdateProfileState> {
  const user = await getCurrentUser();

  const validated = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const email = validated.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== user.id) {
    return { error: "Esiste già un account con questa email." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: validated.data.name, email },
  });

  revalidatePath("/", "layout");
  return { success: true };
}
