import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { ticket: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { GET } from "./route";

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const ticket = { updatedAt: new Date("2026-01-01T10:00:00.000Z"), requesterId: "owner" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/tickets/[id]/activity", () => {
  it("returns the timestamp for the ticket's own requester", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER" } as never);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({ ...ticket } as never);

    const res = await GET(new Request("http://x"), paramsFor("t1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updatedAt).toBe(ticket.updatedAt.toISOString());
  });

  it("refuses a USER polling a ticket they don't own", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "intruder", role: "USER" } as never);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({ ...ticket } as never);

    const res = await GET(new Request("http://x"), paramsFor("t1"));

    expect(res.status).toBe(403);
  });

  it("lets staff poll any ticket", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "tech", role: "IT" } as never);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({ ...ticket } as never);

    const res = await GET(new Request("http://x"), paramsFor("t1"));

    expect(res.status).toBe(200);
  });

  it("404s for a nonexistent ticket", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER" } as never);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);

    const res = await GET(new Request("http://x"), paramsFor("ghost"));

    expect(res.status).toBe(404);
  });
});
