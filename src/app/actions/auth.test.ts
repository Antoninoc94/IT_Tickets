import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/session", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));
vi.mock("argon2", () => ({
  default: { verify: vi.fn(), hash: vi.fn() },
}));

import argon2 from "argon2";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { login } from "./auth";

function loginForm(email: string, password: string) {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

const baseUser = {
  id: "u1",
  email: "mario@azienda.it",
  active: true,
  passwordHash: "hash",
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
  emailVerifiedAt: new Date("2026-01-01"),
  role: "USER" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login lockout", () => {
  it("increments failedLoginAttempts on a wrong password without locking yet", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...baseUser, failedLoginAttempts: 2 } as never);
    vi.mocked(argon2.verify).mockResolvedValue(false);

    const state = await login(undefined, loginForm(baseUser.email, "wrong"));

    expect(state?.error).toBe("Email o password errati.");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { failedLoginAttempts: 3, lockedUntil: null },
    });
  });

  it("locks the account for 15 minutes on the 5th consecutive failure", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...baseUser, failedLoginAttempts: 4 } as never);
    vi.mocked(argon2.verify).mockResolvedValue(false);

    const before = Date.now();
    const state = await login(undefined, loginForm(baseUser.email, "wrong"));

    expect(state?.error).toBe("Email o password errati.");
    const call = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(call.data.failedLoginAttempts).toBe(0);
    const lockedUntil = call.data.lockedUntil as Date;
    expect(lockedUntil.getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000 - 1000);
  });

  it("rejects a correct password while the account is still locked, without checking it", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
    } as never);

    const state = await login(undefined, loginForm(baseUser.email, "correct-password"));

    expect(state?.error).toMatch(/Troppi tentativi falliti/);
    expect(argon2.verify).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("lets a correct password through once the lockout window has passed, and resets the counters", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...baseUser,
      failedLoginAttempts: 4,
      lockedUntil: new Date(Date.now() - 1000), // expired
    } as never);
    vi.mocked(argon2.verify).mockResolvedValue(true);

    await expect(login(undefined, loginForm(baseUser.email, "correct"))).rejects.toThrow("REDIRECT");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    expect(createSession).toHaveBeenCalledWith("u1", "USER");
  });

  it("does not lock out or reveal anything for a nonexistent account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const state = await login(undefined, loginForm("nobody@azienda.it", "whatever"));

    expect(state?.error).toBe("Email o password errati.");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
