import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: { findUnique: vi.fn(), update: vi.fn() },
    comment: { create: vi.fn() },
    user: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/mail", () => ({ sendMail: vi.fn(), ticketUrl: vi.fn((id: string) => `https://example/tickets/${id}`) }));
vi.mock("@/lib/email-html", () => ({ buildEmailHtml: vi.fn(() => "<html></html>") }));
vi.mock("@/lib/settings", () => ({
  getSettings: vi.fn(async () => ({ emailEnabled: false })),
  renderTemplate: vi.fn((t: string) => t),
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { addComment } from "./tickets";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const ticket = {
  id: "t1",
  title: "Stampante rotta",
  status: "OPEN",
  requesterId: "owner",
  requester: { email: "owner@azienda.it" },
  assignee: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.ticket.findUnique).mockResolvedValue({ ...ticket } as never);
});

describe("addComment() authorization", () => {
  it("refuses a USER commenting on a ticket they don't own", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "intruder", role: "USER", name: "Intruso" } as never);

    const state = await addComment("t1", undefined, form({ body: "Curioso di sapere come va" }));

    expect(state?.error).toBe("Non autorizzato.");
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it("lets the requester comment on their own ticket", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER", name: "Il Proprietario" } as never);

    await addComment("t1", undefined, form({ body: "Aggiungo un dettaglio" }));

    expect(prisma.comment.create).toHaveBeenCalledOnce();
    const data = vi.mocked(prisma.comment.create).mock.calls[0][0].data;
    expect(data.internal).toBe(false);
  });

  it("never marks a USER's comment internal, even if the field is forced in the request", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER", name: "Il Proprietario" } as never);

    await addComment("t1", undefined, form({ body: "Provo a forzare", internal: "on" }));

    const data = vi.mocked(prisma.comment.create).mock.calls[0][0].data;
    expect(data.internal).toBe(false);
  });

  it("lets staff write an internal note on a ticket they don't own", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "tech", role: "IT", name: "Tecnico" } as never);

    await addComment("t1", undefined, form({ body: "Nota per i colleghi", internal: "on" }));

    expect(prisma.comment.create).toHaveBeenCalledOnce();
    const data = vi.mocked(prisma.comment.create).mock.calls[0][0].data;
    expect(data.internal).toBe(true);
  });

  it("returns an error for a nonexistent ticket without leaking anything else", async () => {
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER", name: "Il Proprietario" } as never);

    const state = await addComment("ghost", undefined, form({ body: "Ciao" }));

    expect(state?.error).toBe("Ticket non trovato.");
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });
});
