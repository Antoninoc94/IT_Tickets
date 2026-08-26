import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("argon2", () => ({ default: { verify: vi.fn(), hash: vi.fn() } }));
vi.mock("@/lib/verification-code", () => ({
  issuePendingEmailCode: vi.fn(),
  verifyCode: vi.fn(),
  isOnCooldown: vi.fn(() => false),
}));

process.env.ALLOWED_EMAIL_DOMAIN = "azienda.it";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { issuePendingEmailCode, verifyCode } from "@/lib/verification-code";
import { cancelEmailChange, confirmEmailChange, updateProfile } from "./account";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const currentUser = {
  id: "u1",
  email: "mario@azienda.it",
  name: "Mario Rossi",
  role: "USER" as const,
  active: true,
  mustChangePassword: false,
  pendingEmail: null as string | null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ ...currentUser } as never);
});

describe("updateProfile()", () => {
  it("updates name/phone only when the email is unchanged", async () => {
    const state = await updateProfile(
      undefined,
      form({ name: "Mario Rossi", email: currentUser.email, phone: "123" })
    );

    expect(state).toEqual({ success: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Mario Rossi", phone: "123" },
    });
    expect(issuePendingEmailCode).not.toHaveBeenCalled();
  });

  it("rejects a new email outside the allowed company domain, touching nothing", async () => {
    const state = await updateProfile(
      undefined,
      form({ name: "Mario Rossi", email: "mario@gmail.com" })
    );

    expect(state?.error).toMatch(/email aziendale/);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(issuePendingEmailCode).not.toHaveBeenCalled();
  });

  it("rejects a new email already used by another account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "someone-else" } as never);

    const state = await updateProfile(
      undefined,
      form({ name: "Mario Rossi", email: "altro@azienda.it" })
    );

    expect(state?.error).toMatch(/già un account/);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("never writes the real email column directly — it only issues a pending-email code", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const state = await updateProfile(
      undefined,
      form({ name: "Mario Rossi", email: "nuovo@azienda.it" })
    );

    expect(state).toEqual({ success: true, pendingEmailSent: true });

    // The account's own `email` field must not appear in this update call.
    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("email");
    expect(updateCall.data).not.toHaveProperty("emailVerifiedAt");

    expect(issuePendingEmailCode).toHaveBeenCalledWith("u1", "nuovo@azienda.it", "Mario Rossi");
  });
});

describe("confirmEmailChange()", () => {
  const pending = {
    ...currentUser,
    pendingEmail: "nuovo@azienda.it",
    pendingEmailCodeHash: "hash",
    pendingEmailCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    pendingEmailAttempts: 0,
  };

  it("reports no pending change if none exists", async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ ...currentUser } as never);

    const state = await confirmEmailChange(undefined, form({ code: "123456" }));

    expect(state?.error).toMatch(/Nessun cambio email/);
  });

  it("increments attempts and keeps the old email on a wrong code", async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ ...pending } as never);
    vi.mocked(verifyCode).mockResolvedValue(false);

    const state = await confirmEmailChange(undefined, form({ code: "000000" }));

    expect(state?.error).toBe("Codice non corretto.");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { pendingEmailAttempts: { increment: 1 } },
    });
  });

  it("swaps the email in on a correct code and clears pending state", async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ ...pending } as never);
    vi.mocked(verifyCode).mockResolvedValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // address still free

    const state = await confirmEmailChange(undefined, form({ code: "123456" }));

    expect(state).toEqual({ success: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        email: "nuovo@azienda.it",
        pendingEmail: null,
        pendingEmailCodeHash: null,
        pendingEmailCodeExpiresAt: null,
        pendingEmailAttempts: 0,
      },
    });
  });
});

describe("cancelEmailChange()", () => {
  it("clears the pending fields without touching the real email", async () => {
    await cancelEmailChange();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { pendingEmail: null, pendingEmailCodeHash: null, pendingEmailCodeExpiresAt: null, pendingEmailAttempts: 0 },
    });
  });
});
