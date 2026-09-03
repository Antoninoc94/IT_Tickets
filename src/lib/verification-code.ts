import "server-only";
import crypto from "crypto";
import argon2 from "argon2";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { buildEmailHtml } from "@/lib/email-html";
import { getSettings } from "@/lib/settings";

const CODE_LENGTH = 6;
export const CODE_TTL_MS = 15 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;

export function generateCode() {
  return crypto.randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");
}

export function hashCode(code: string) {
  return argon2.hash(code);
}

export function verifyCode(hash: string, code: string) {
  return argon2.verify(hash, code);
}

export function codeExpiresAt() {
  return new Date(Date.now() + CODE_TTL_MS);
}

/** True if a code was issued too recently to send another one. */
export function isOnCooldown(expiresAt: Date | null) {
  if (!expiresAt) return false;
  const issuedAt = expiresAt.getTime() - CODE_TTL_MS;
  return Date.now() - issuedAt < RESEND_COOLDOWN_MS;
}

/**
 * Generates a fresh code, stores its hash on the user, and emails it to `email`.
 * Shared by self-registration and by a profile email change (both need the
 * recipient to prove they control the new address before it takes effect).
 */
export async function issueVerificationCode(userId: string, email: string, name: string) {
  const code = generateCode();
  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationCodeHash: await hashCode(code),
      verificationCodeExpiresAt: codeExpiresAt(),
      verificationAttempts: 0,
    },
  });

  const settings = await getSettings();
  const subject = `Codice di verifica — ${settings.appName}`;
  const text = `Ciao ${name},\n\nIl tuo codice di verifica è: ${code}\n\nScade tra ${Math.round(CODE_TTL_MS / 60000)} minuti.\nSe non hai richiesto tu questa operazione, ignora questa email o contatta l'IT.`;
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const html = buildEmailHtml(text, settings, {
    ctaUrl: `${appUrl}/register/verify`,
    ctaLabel: "Vai alla pagina di verifica →",
  });

  await sendMail(email, subject, text, html);
}

/**
 * Starts a profile email change: stores `newEmail` as a *pending* address
 * with its own code, without touching the account's current (already
 * verified) `email` — the account keeps working normally under the old
 * address unless and until the new one is confirmed via confirmPendingEmail().
 */
export async function issuePendingEmailCode(userId: string, newEmail: string, name: string) {
  const code = generateCode();
  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmail: newEmail,
      pendingEmailCodeHash: await hashCode(code),
      pendingEmailCodeExpiresAt: codeExpiresAt(),
      pendingEmailAttempts: 0,
    },
  });

  const settings = await getSettings();
  const subject = `Conferma il cambio email — ${settings.appName}`;
  const text = `Ciao ${name},\n\nHai richiesto di cambiare l'email del tuo account ${settings.appName} in questo indirizzo.\n\nIl codice di conferma è: ${code}\n\nScade tra ${Math.round(CODE_TTL_MS / 60000)} minuti. Finché non lo confermi, il tuo account continua a funzionare normalmente con l'email attuale.\n\nSe non hai richiesto tu questa modifica, ignora questa email o contatta l'IT.`;
  const html = buildEmailHtml(text, settings);

  await sendMail(newEmail, subject, text, html);
}
