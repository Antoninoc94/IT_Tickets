"use server";

import * as z from "zod";
import argon2 from "argon2";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { isOnCooldown, issuePendingEmailCode, verifyCode } from "@/lib/verification-code";
import { allowedEmailDomain, isEmailDomainAllowed } from "@/lib/email-domain";

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
  phone: z.string().trim().max(30, { error: "Numero troppo lungo." }).optional(),
});

export type UpdateProfileState = { error?: string; success?: boolean; pendingEmailSent?: boolean } | undefined;

export async function updateProfile(_state: UpdateProfileState, formData: FormData): Promise<UpdateProfileState> {
  const user = await getCurrentUser();

  const validated = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const email = validated.data.email.toLowerCase();
  const emailChanged = email !== user.email.toLowerCase();

  if (emailChanged) {
    const domain = allowedEmailDomain();
    if (!isEmailDomainAllowed(email)) {
      return { error: `Puoi usare solo un'email aziendale (@${domain}).` };
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      return { error: "Esiste già un account con questa email." };
    }
  }

  // Name/phone take effect immediately regardless of the email change below.
  await prisma.user.update({
    where: { id: user.id },
    data: { name: validated.data.name, phone: validated.data.phone ?? null },
  });

  if (!emailChanged) {
    revalidatePath("/", "layout");
    return { success: true };
  }

  // The current (already verified) email keeps working until the new one is
  // confirmed with its own code — this never touches `email` directly, so a
  // typo'd or unreachable address can't lock the account out.
  await issuePendingEmailCode(user.id, email, validated.data.name);
  revalidatePath("/account/profile");
  return { success: true, pendingEmailSent: true };
}

// ---------------------------------------------------------------------------
// Confirm / cancel a pending email change
// ---------------------------------------------------------------------------

const ConfirmEmailSchema = z.object({
  code: z.string().trim().length(6, { error: "Il codice deve avere 6 cifre." }),
});

const MAX_PENDING_EMAIL_ATTEMPTS = 5;

export type ConfirmEmailState = { error?: string; success?: boolean } | undefined;

export async function confirmEmailChange(_state: ConfirmEmailState, formData: FormData): Promise<ConfirmEmailState> {
  const user = await getCurrentUser();

  const validated = ConfirmEmailSchema.safeParse({ code: formData.get("code") });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Codice non valido." };
  }

  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!fullUser.pendingEmail || !fullUser.pendingEmailCodeHash || !fullUser.pendingEmailCodeExpiresAt) {
    return { error: "Nessun cambio email in sospeso." };
  }
  if (fullUser.pendingEmailCodeExpiresAt < new Date()) {
    return { error: "Il codice è scaduto. Richiedine uno nuovo." };
  }
  if (fullUser.pendingEmailAttempts >= MAX_PENDING_EMAIL_ATTEMPTS) {
    return { error: "Troppi tentativi. Richiedi un nuovo codice." };
  }

  const valid = await verifyCode(fullUser.pendingEmailCodeHash, validated.data.code);
  if (!valid) {
    await prisma.user.update({ where: { id: user.id }, data: { pendingEmailAttempts: { increment: 1 } } });
    return { error: "Codice non corretto." };
  }

  // The address may have been claimed by someone else while this was pending.
  const existing = await prisma.user.findUnique({ where: { email: fullUser.pendingEmail } });
  if (existing && existing.id !== user.id) {
    return { error: "Questa email è stata registrata da un altro account nel frattempo." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: fullUser.pendingEmail,
      pendingEmail: null,
      pendingEmailCodeHash: null,
      pendingEmailCodeExpiresAt: null,
      pendingEmailAttempts: 0,
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function cancelEmailChange(): Promise<void> {
  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { pendingEmail: null, pendingEmailCodeHash: null, pendingEmailCodeExpiresAt: null, pendingEmailAttempts: 0 },
  });
  revalidatePath("/account/profile");
}

export type ResendPendingEmailState = { error?: string; success?: boolean } | undefined;

export async function resendPendingEmailCode(): Promise<ResendPendingEmailState> {
  const user = await getCurrentUser();
  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  if (!fullUser.pendingEmail) {
    return { error: "Nessun cambio email in sospeso." };
  }
  if (isOnCooldown(fullUser.pendingEmailCodeExpiresAt)) {
    return { error: "Attendi qualche secondo prima di richiedere un nuovo codice." };
  }

  await issuePendingEmailCode(user.id, fullUser.pendingEmail, fullUser.name);
  return { success: true };
}
