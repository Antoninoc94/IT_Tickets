import "server-only";
import crypto from "crypto";
import argon2 from "argon2";

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
