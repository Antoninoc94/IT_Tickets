import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: { findUnique: vi.fn(), update: vi.fn() },
    comment: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn(async () => []), findUnique: vi.fn() },
    ticketEvent: { create: vi.fn() },
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
import { addComment, deleteComment, editComment } from "./tickets";

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

describe("addComment() auto-assign on public IT reply", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "tech", name: "Tecnico", email: "tech@azienda.it" } as never);
    vi.mocked(prisma.ticket.update).mockResolvedValue({ ...ticket, requester: ticket.requester } as never);
  });

  it("claims an unassigned ticket when an IT user posts a public reply", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "tech", role: "IT", name: "Tecnico" } as never);

    await addComment("t1", undefined, form({ body: "Ci penso io" }));

    const assignCall = vi.mocked(prisma.ticket.update).mock.calls.find((c) => "assigneeId" in c[0].data);
    expect(assignCall?.[0].data).toMatchObject({ assigneeId: "tech", status: "IN_PROGRESS" });
  });

  it("does not touch the assignee for an internal note", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "tech", role: "IT", name: "Tecnico" } as never);

    await addComment("t1", undefined, form({ body: "Nota interna", internal: "on" }));

    const assignCall = vi.mocked(prisma.ticket.update).mock.calls.find((c) => "assigneeId" in c[0].data);
    expect(assignCall).toBeUndefined();
  });

  it("does not steal an already-assigned ticket from a colleague", async () => {
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      ...ticket,
      assignee: { id: "other-tech", email: "other@azienda.it" },
    } as never);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "tech", role: "IT", name: "Tecnico" } as never);

    await addComment("t1", undefined, form({ body: "Rispondo io per il collega" }));

    const assignCall = vi.mocked(prisma.ticket.update).mock.calls.find((c) => "assigneeId" in c[0].data);
    expect(assignCall).toBeUndefined();
  });

  it("does not auto-assign an ADMIN who replies", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "boss", role: "ADMIN", name: "Capo" } as never);

    await addComment("t1", undefined, form({ body: "Risposta dall'admin" }));

    const assignCall = vi.mocked(prisma.ticket.update).mock.calls.find((c) => "assigneeId" in c[0].data);
    expect(assignCall).toBeUndefined();
  });
});

function commentFixture(overrides: Partial<{
  id: string;
  ticketId: string;
  authorId: string;
  createdAt: Date;
  deletedAt: Date | null;
}> = {}) {
  return {
    id: "c1",
    ticketId: "t1",
    authorId: "owner",
    body: "Testo originale",
    createdAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("editComment()", () => {
  it("lets the author edit within the 5-minute window", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER" } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentFixture() as never);

    const state = await editComment("c1", undefined, form({ body: "Testo corretto" }));

    expect(state).toEqual({ success: true });
    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { body: "Testo corretto", editedAt: expect.any(Date) },
    });
  });

  it("refuses to edit someone else's comment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "intruder", role: "USER" } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentFixture() as never);

    const state = await editComment("c1", undefined, form({ body: "Testo modificato" }));

    expect(state?.error).toBe("Non autorizzato.");
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });

  it("refuses to edit past the 5-minute window, even for the author", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER" } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(
      commentFixture({ createdAt: new Date(Date.now() - 6 * 60 * 1000) }) as never
    );

    const state = await editComment("c1", undefined, form({ body: "Troppo tardi" }));

    expect(state?.error).toMatch(/5 minuti/);
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });

  it("refuses to edit an already-deleted comment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER" } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(
      commentFixture({ deletedAt: new Date() }) as never
    );

    const state = await editComment("c1", undefined, form({ body: "..." }));

    expect(state?.error).toBe("Commento non trovato.");
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });
});

describe("deleteComment()", () => {
  it("lets the author delete their own comment within the window", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER" } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentFixture() as never);

    const state = await deleteComment("c1");

    expect(state).toBeUndefined();
    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { deletedAt: expect.any(Date), deletedById: "owner" },
    });
  });

  it("refuses the author past the 5-minute window", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner", role: "USER" } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(
      commentFixture({ createdAt: new Date(Date.now() - 6 * 60 * 1000) }) as never
    );

    const state = await deleteComment("c1");

    expect(state?.error).toBe("Non autorizzato.");
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });

  it("refuses another IT staff member trying to delete someone else's comment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "tech", role: "IT" } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentFixture() as never);

    const state = await deleteComment("c1");

    expect(state?.error).toBe("Non autorizzato.");
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });

  it("lets an Admin delete any comment, regardless of age or author", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "boss", role: "ADMIN" } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(
      commentFixture({ createdAt: new Date(Date.now() - 60 * 60 * 1000) }) as never
    );

    const state = await deleteComment("c1");

    expect(state).toBeUndefined();
    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { deletedAt: expect.any(Date), deletedById: "boss" },
    });
  });

  it("no-ops on an already-deleted comment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "boss", role: "ADMIN" } as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(
      commentFixture({ deletedAt: new Date() }) as never
    );

    const state = await deleteComment("c1");

    expect(state).toBeUndefined();
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });
});
