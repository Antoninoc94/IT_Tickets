import "server-only";
import crypto from "crypto";

/** Constant-time comparison against CRON_SECRET, to avoid a timing side-channel on the header check. */
export function isValidCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!secret || !provided) return false;

  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);
  if (secretBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(secretBuf, providedBuf);
}
