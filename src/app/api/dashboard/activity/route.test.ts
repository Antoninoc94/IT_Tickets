import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { ticket: { aggregate: vi.fn() } },
}));
vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/dashboard/activity", () => {
  it("scopes the aggregate to the user's own tickets for a USER", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "USER" } as never);
    vi.mocked(prisma.ticket.aggregate).mockResolvedValue({ _max: { updatedAt: new Date("2026-01-01T00:00:00.000Z") } } as never);

    const res = await GET();
    const body = await res.json();

    expect(prisma.ticket.aggregate).toHaveBeenCalledWith({
      _max: { updatedAt: true },
      where: { requesterId: "u1" },
    });
    expect(body.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("looks across all tickets for staff", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "tech", role: "IT" } as never);
    vi.mocked(prisma.ticket.aggregate).mockResolvedValue({ _max: { updatedAt: null } } as never);

    const res = await GET();
    const body = await res.json();

    expect(prisma.ticket.aggregate).toHaveBeenCalledWith({
      _max: { updatedAt: true },
      where: {},
    });
    expect(body.updatedAt).toBeNull();
  });
});
