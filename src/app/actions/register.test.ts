import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() } },
}));
vi.mock("@/lib/session", () => ({ createSession: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));
vi.mock("argon2", () => ({ default: { hash: vi.fn(async () => "hashed") } }));
vi.mock("@/lib/verification-code", () => ({
  verifyCode: vi.fn(),
  isOnCooldown: vi.fn(() => false),
  issueVerificationCode: vi.fn(),
}));

process.env.ALLOWED_EMAIL_DOMAIN = "azienda.it";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { verifyCode, issueVerificationCode } from "@/lib/verification-code";
import { register, verifyRegistration } from "./register";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const pendingUser = {
  id: "u1",
  email: "mario@azienda.it",
  name: "Mario Rossi",
  role: "USER" as const,
  emailVerifiedAt: null as Date | null,
  verificationCodeHash: "codehash",
  verificationCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
  verificationAttempts: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("register()", () => {
  it("rejects a signup email outside the allowed company domain", async () => {
    const state = await register(
      undefined,
      form({ firstName: "Mario", lastName: "Rossi", email: "mario@gmail.com", password: "password123" })
    );
    expect(state?.error).toMatch(/email aziendale/);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates the user and issues a code for an allowed domain", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "u1", email: "mario@azienda.it", name: "Mario Rossi" } as never);

    await expect(
      register(undefined, form({ firstName: "Mario", lastName: "Rossi", email: "mario@azienda.it", password: "password123" }))
    ).rejects.toThrow("REDIRECT");

    expect(issueVerificationCode).toHaveBeenCalledWith("u1", "mario@azienda.it", "Mario Rossi");
  });
});

describe("verifyRegistration()", () => {
  it("increments attempts and rejects a wrong code", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...pendingUser } as never);
    vi.mocked(verifyCode).mockResolvedValue(false);

    const state = await verifyRegistration(undefined, form({ email: pendingUser.email, code: "000000" }));

    expect(state?.error).toBe("Codice non corretto.");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { verificationAttempts: { increment: 1 } },
    });
  });

  it("refuses to even check the code after 5 attempts", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...pendingUser, verificationAttempts: 5 } as never);

    const state = await verifyRegistration(undefined, form({ email: pendingUser.email, code: "123456" }));

    expect(state?.error).toMatch(/Troppi tentativi/);
    expect(verifyCode).not.toHaveBeenCalled();
  });

  it("rejects an expired code", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...pendingUser,
      verificationCodeExpiresAt: new Date(Date.now() - 1000),
    } as never);

    const state = await verifyRegistration(undefined, form({ email: pendingUser.email, code: "123456" }));

    expect(state?.error).toMatch(/scaduto/);
  });

  it("verifies the account and starts a session on a correct code", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...pendingUser } as never);
    vi.mocked(verifyCode).mockResolvedValue(true);

    await expect(
      verifyRegistration(undefined, form({ email: pendingUser.email, code: "123456" }))
    ).rejects.toThrow("REDIRECT");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        emailVerifiedAt: expect.any(Date),
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
        verificationAttempts: 0,
      },
    });
    expect(createSession).toHaveBeenCalledWith("u1", "USER");
  });
});
