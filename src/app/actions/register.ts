"use server";

import * as z from "zod";
import argon2 from "argon2";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { isOnCooldown, issueVerificationCode, verifyCode } from "@/lib/verification-code";
import { allowedEmailDomain, isEmailDomainAllowed } from "@/lib/email-domain";

const RegisterSchema = z.object({
  firstName: z.string().trim().min(2, { error: "Il nome deve avere almeno 2 caratteri." }),
  lastName:  z.string().trim().min(2, { error: "Il cognome deve avere almeno 2 caratteri." }),
  email:     z.email({ error: "Inserisci un'email valida." }),
  password:  z.string().min(8, { error: "La password deve avere almeno 8 caratteri." }),
});

export type RegisterState = { error?: string } | undefined;

export async function register(_state: RegisterState, formData: FormData): Promise<RegisterState> {
  const validated = RegisterSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName:  formData.get("lastName"),
    email:     formData.get("email"),
    password:  formData.get("password"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const { firstName, lastName, email, password } = validated.data;
  const name = `${firstName} ${lastName}`;
  const normalizedEmail = email.toLowerCase();

  const domain = allowedEmailDomain();
  if (!isEmailDomainAllowed(normalizedEmail)) {
    return { error: `Puoi registrarti solo con un'email aziendale (@${domain}).` };
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing?.emailVerifiedAt) {
    return { error: "Esiste già un account con questa email. Prova ad accedere." };
  }

  const passwordHash = await argon2.hash(password);

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash } })
    : await prisma.user.create({
        data: { name, email: normalizedEmail, passwordHash, role: "USER" },
      });

  await issueVerificationCode(user.id, user.email, user.name);

  redirect(`/register/verify?email=${encodeURIComponent(user.email)}`);
}

const VerifySchema = z.object({
  email: z.email(),
  code: z.string().trim().length(6, { error: "Il codice deve avere 6 cifre." }),
});

export type VerifyState = { error?: string } | undefined;

const MAX_VERIFY_ATTEMPTS = 5;

export async function verifyRegistration(_state: VerifyState, formData: FormData): Promise<VerifyState> {
  const validated = VerifySchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const { email, code } = validated.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || user.emailVerifiedAt || !user.verificationCodeHash || !user.verificationCodeExpiresAt) {
    return { error: "Richiesta di verifica non valida. Registrati di nuovo." };
  }

  if (user.verificationCodeExpiresAt < new Date()) {
    return { error: "Il codice è scaduto. Richiedine uno nuovo." };
  }

  if (user.verificationAttempts >= MAX_VERIFY_ATTEMPTS) {
    return { error: "Troppi tentativi. Richiedi un nuovo codice." };
  }

  const valid = await verifyCode(user.verificationCodeHash, code);
  if (!valid) {
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationAttempts: { increment: 1 } },
    });
    return { error: "Codice non corretto." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      verificationCodeHash: null,
      verificationCodeExpiresAt: null,
      verificationAttempts: 0,
    },
  });

  await createSession(user.id, user.role);
  redirect("/dashboard");
}

export type ResendState = { error?: string; success?: boolean } | undefined;

export async function resendVerificationCode(_state: ResendState, formData: FormData): Promise<ResendState> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.emailVerifiedAt) {
    return { error: "Richiesta non valida." };
  }

  if (isOnCooldown(user.verificationCodeExpiresAt)) {
    return { error: "Attendi qualche secondo prima di richiedere un nuovo codice." };
  }

  await issueVerificationCode(user.id, user.email, user.name);
  return { success: true };
}
