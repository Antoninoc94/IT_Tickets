import "server-only";

/** Domain self-registration (and now profile email changes) are restricted to, if configured. */
export function allowedEmailDomain(): string {
  return (process.env.ALLOWED_EMAIL_DOMAIN ?? "").toLowerCase().trim();
}

export function isEmailDomainAllowed(email: string): boolean {
  const domain = allowedEmailDomain();
  if (!domain) return true; // no restriction configured
  return email.toLowerCase().endsWith(`@${domain}`);
}
