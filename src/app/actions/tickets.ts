"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { sendMail, ticketUrl } from "@/lib/mail";
import { getSettings, renderTemplate } from "@/lib/settings";
import { statusLabels } from "@/lib/ticket-labels";
import { deleteFile, saveUploadedFiles } from "@/lib/attachments";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createEvent(
  ticketId: string,
  actorId: string | null,
  type: import("@/generated/prisma/enums").TicketEventType,
  meta?: Record<string, string>
) {
  await prisma.ticketEvent.create({
    data: { ticketId, actorId, type, meta: meta ?? {} },
  });
}

// ---------------------------------------------------------------------------
// Create ticket
// ---------------------------------------------------------------------------

const NewTicketSchema = z.object({
  title: z.string().trim().min(3, { error: "Il titolo deve avere almeno 3 caratteri." }),
  description: z.string().trim().min(10, { error: "Descrivi il problema con almeno 10 caratteri." }),
  category: z.enum(["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export type NewTicketState = { error?: string } | undefined;

export async function createTicket(_state: NewTicketState, formData: FormData): Promise<NewTicketState> {
  const user = await getCurrentUser();

  const validated = NewTicketSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const { error: uploadError, saved } = await saveUploadedFiles(formData.getAll("files") as File[]);
  if (uploadError) {
    return { error: uploadError };
  }

  const tagIds = user.role !== "USER"
    ? (formData.getAll("tagIds") as string[]).filter(Boolean)
    : [];

  const ticket = await prisma.ticket.create({
    data: {
      ...validated.data,
      requesterId: user.id,
      attachments: {
        create: saved.map((f) => ({ ...f, uploadedById: user.id })),
      },
      ...(tagIds.length > 0 ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
    },
  });

  await createEvent(ticket.id, user.id, "CREATED");

  const itAndAdmins = await prisma.user.findMany({
    where: { role: "IT", active: true },
    select: { email: true },
  });

  const settings = await getSettings();
  const vars = {
    ticketTitle: ticket.title,
    ticketDescription: ticket.description,
    requesterName: user.name,
    ticketUrl: ticketUrl(ticket.id),
  };
  if (settings.emailEnabled) {
    const subject = renderTemplate(settings.newTicketEmailSubject, vars);
    const body = renderTemplate(settings.newTicketEmailBody, vars);
    await Promise.all(itAndAdmins.map((recipient) => sendMail(recipient.email, subject, body)));
  }

  redirect(`/tickets/${ticket.id}`);
}

// ---------------------------------------------------------------------------
// Add comment
// ---------------------------------------------------------------------------

const CommentSchema = z.object({
  body: z.string().trim().min(1, { error: "Il commento non può essere vuoto." }),
  internal: z.enum(["on"]).optional(),
});

export type CommentState = { error?: string } | undefined;

export async function addComment(
  ticketId: string,
  _state: CommentState,
  formData: FormData
): Promise<CommentState> {
  const user = await getCurrentUser();

  const validated = CommentSchema.safeParse({
    body: formData.get("body"),
    internal: formData.get("internal") ?? undefined,
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const { error: uploadError, saved } = await saveUploadedFiles(formData.getAll("files") as File[]);
  if (uploadError) {
    return { error: uploadError };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { requester: true, assignee: { select: { id: true, email: true } } },
  });
  if (!ticket) {
    return { error: "Ticket non trovato." };
  }

  if (ticket.status === "CLOSED" && user.role === "USER") {
    return { error: "Non è possibile commentare un ticket chiuso." };
  }

  const isInternal = user.role !== "USER" && validated.data.internal === "on";

  await prisma.comment.create({
    data: {
      ticketId,
      authorId: user.id,
      body: validated.data.body,
      internal: isInternal,
      attachments: {
        create: saved.map((f) => ({ ...f, ticketId, uploadedById: user.id })),
      },
    },
  });

  if (!isInternal) {
    const settings = await getSettings();
    const vars = {
      ticketTitle: ticket.title,
      authorName: user.name,
      commentBody: validated.data.body,
      ticketUrl: ticketUrl(ticket.id),
    };

    if (settings.emailEnabled) {
      // Notify requester when IT/Admin comments
      if (ticket.requesterId !== user.id) {
        await sendMail(
          ticket.requester.email,
          renderTemplate(settings.newCommentEmailSubject, vars),
          renderTemplate(settings.newCommentEmailBody, vars)
        );
      }
      // Notify assignee when the requester (USER) comments
      if (user.role === "USER" && ticket.assignee && ticket.assignee.id !== user.id) {
        await sendMail(
          ticket.assignee.email,
          renderTemplate(settings.newCommentEmailSubject, vars),
          renderTemplate(settings.newCommentEmailBody, vars)
        );
      }
      // @mention notifications
      const mentionedNames = [...new Set((validated.data.body.match(/@([\w\s]+?)(?=\s|$|[,.])/g) ?? []).map((m) => m.slice(1).trim()))];
      if (mentionedNames.length > 0) {
        const mentionedUsers = await prisma.user.findMany({
          where: { name: { in: mentionedNames }, active: true, id: { not: user.id } },
          select: { email: true },
        });
        await Promise.all(
          mentionedUsers.map((u) =>
            sendMail(
              u.email,
              renderTemplate(settings.mentionEmailSubject, vars),
              renderTemplate(settings.mentionEmailBody, vars)
            )
          )
        );
      }
    }
  }

  revalidatePath(`/tickets/${ticketId}`);
}

// ---------------------------------------------------------------------------
// Update status (staff only)
// ---------------------------------------------------------------------------

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const user = await getCurrentUser();
  if (user.role === "USER") {
    throw new Error("Non autorizzato.");
  }

  const current = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { status: true } });
  if (!current) return;

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : undefined,
      closedAt: status === "CLOSED" ? new Date() : undefined,
    },
    include: { requester: true },
  });

  await createEvent(ticketId, user.id, "STATUS_CHANGED", { from: current.status, to: status });

  const settings = await getSettings();
  if (settings.emailEnabled) {
    const vars = {
      ticketTitle: ticket.title,
      status: statusLabels[status],
      ticketUrl: ticketUrl(ticket.id),
    };
    await sendMail(
      ticket.requester.email,
      renderTemplate(settings.statusChangedEmailSubject, vars),
      renderTemplate(settings.statusChangedEmailBody, vars)
    );
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Close ticket
// ---------------------------------------------------------------------------

export type CloseTicketState = { error?: string } | undefined;

export async function closeTicket(ticketId: string): Promise<CloseTicketState> {
  const user = await getCurrentUser();

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { requester: true } });
  if (!ticket) {
    return { error: "Ticket non trovato." };
  }

  const isStaff = user.role !== "USER";
  if (!isStaff && ticket.requesterId !== user.id) {
    return { error: "Non puoi chiudere questo ticket." };
  }
  if (ticket.status === "CLOSED") {
    return;
  }

  const prevStatus = ticket.status;

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "CLOSED", closedAt: new Date() },
    include: { requester: true },
  });

  await createEvent(ticketId, user.id, "CLOSED", { from: prevStatus });

  if (isStaff) {
    const settings = await getSettings();
    if (settings.emailEnabled) {
      const vars = { ticketTitle: updated.title, status: statusLabels.CLOSED, ticketUrl: ticketUrl(updated.id) };
      await sendMail(
        updated.requester.email,
        renderTemplate(settings.statusChangedEmailSubject, vars),
        renderTemplate(settings.statusChangedEmailBody, vars)
      );
    }
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Reopen ticket
// ---------------------------------------------------------------------------

export type ReopenTicketState = { error?: string } | undefined;

const ReopenSchema = z.object({
  reason: z.string().trim().min(5, { error: "Descrivi brevemente il motivo della riapertura (min. 5 caratteri)." }),
});

export async function reopenTicket(
  ticketId: string,
  _state: ReopenTicketState,
  formData: FormData
): Promise<ReopenTicketState> {
  const user = await getCurrentUser();

  const validated = ReopenSchema.safeParse({ reason: formData.get("reason") });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { requester: true },
  });
  if (!ticket) return { error: "Ticket non trovato." };

  const isStaff = user.role !== "USER";
  if (!isStaff && ticket.requesterId !== user.id) {
    return { error: "Non puoi riaprire questo ticket." };
  }
  if (ticket.status !== "CLOSED") {
    return { error: "Il ticket non è chiuso." };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "OPEN", closedAt: null },
  });

  await prisma.comment.create({
    data: {
      ticketId,
      authorId: user.id,
      body: `Ticket riaperto. Motivo: ${validated.data.reason}`,
      internal: false,
    },
  });

  await createEvent(ticketId, user.id, "REOPENED");

  // Notify IT/Admin when a user reopens their ticket
  if (!isStaff) {
    const settings = await getSettings();
    if (settings.emailEnabled) {
      const itAndAdmins = await prisma.user.findMany({
        where: { role: "IT", active: true },
        select: { email: true },
      });
      const vars = {
        ticketTitle: ticket.title,
        status: statusLabels.OPEN,
        ticketUrl: ticketUrl(ticket.id),
      };
      await Promise.all(
        itAndAdmins.map((r) =>
          sendMail(
            r.email,
            renderTemplate(settings.statusChangedEmailSubject, vars),
            renderTemplate(settings.statusChangedEmailBody, vars)
          )
        )
      );
    }
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Delete ticket
// ---------------------------------------------------------------------------

export type DeleteTicketState = { error?: string } | undefined;

export async function deleteTicket(ticketId: string): Promise<DeleteTicketState> {
  const user = await getCurrentUser();

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return { error: "Ticket non trovato." };
  }

  const isStaff = user.role !== "USER";
  const isOwnOpenTicket = ticket.requesterId === user.id && ticket.status === "OPEN";
  if (!isStaff && !isOwnOpenTicket) {
    return { error: "Non puoi eliminare questo ticket." };
  }

  const attachments = await prisma.attachment.findMany({
    where: { ticketId },
    select: { storageKey: true },
  });
  await Promise.all(attachments.map((a) => deleteFile(a.storageKey)));

  await prisma.ticket.delete({ where: { id: ticketId } });

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Mark ticket as viewed (updates TicketView for unread badge)
// ---------------------------------------------------------------------------

export async function markTicketViewed(ticketId: string) {
  const user = await getCurrentUser();
  await prisma.ticketView.upsert({
    where: { userId_ticketId: { userId: user.id, ticketId } },
    create: { userId: user.id, ticketId },
    update: { viewedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Update ticket priority / category (staff only)
// ---------------------------------------------------------------------------

export async function updateTicketMeta(
  ticketId: string,
  field: "priority" | "category",
  value: string
) {
  const user = await getCurrentUser();
  if (user.role === "USER") throw new Error("Non autorizzato.");

  if (field === "priority") {
    const valid: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (!valid.includes(value as TicketPriority)) throw new Error("Valore non valido.");
    const current = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { priority: true } });
    await prisma.ticket.update({ where: { id: ticketId }, data: { priority: value as TicketPriority } });
    if (current) await createEvent(ticketId, user.id, "PRIORITY_CHANGED", { from: current.priority, to: value });
  } else {
    const valid: TicketCategory[] = ["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"];
    if (!valid.includes(value as TicketCategory)) throw new Error("Valore non valido.");
    const current = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { category: true } });
    await prisma.ticket.update({ where: { id: ticketId }, data: { category: value as TicketCategory } });
    if (current) await createEvent(ticketId, user.id, "CATEGORY_CHANGED", { from: current.category, to: value });
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Assign ticket
// ---------------------------------------------------------------------------

export async function assignTicket(ticketId: string, assigneeId: string) {
  const user = await getCurrentUser();
  if (user.role === "USER") {
    throw new Error("Non autorizzato.");
  }

  const current = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { status: true, assigneeId: true },
  });
  if (!current) return;

  const assignee = assigneeId
    ? await prisma.user.findUnique({ where: { id: assigneeId } })
    : null;

  const autoStart = Boolean(assignee) && current.status === "OPEN";

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assigneeId: assigneeId || null,
      ...(autoStart ? { status: "IN_PROGRESS" } : {}),
    },
    include: { requester: true },
  });

  if (assignee) {
    await createEvent(ticketId, user.id, "ASSIGNED", { assigneeName: assignee.name });
  } else {
    await createEvent(ticketId, user.id, "UNASSIGNED");
  }

  if (autoStart) {
    await createEvent(ticketId, user.id, "STATUS_CHANGED", { from: "OPEN", to: "IN_PROGRESS" });
  }

  const settings = await getSettings();

  if (settings.emailEnabled) {
    if (assignee) {
      const vars = { ticketTitle: ticket.title, ticketUrl: ticketUrl(ticket.id) };
      await sendMail(
        assignee.email,
        renderTemplate(settings.assignedEmailSubject, vars),
        renderTemplate(settings.assignedEmailBody, vars)
      );
    }
    if (autoStart) {
      const vars = { ticketTitle: ticket.title, status: statusLabels.IN_PROGRESS, ticketUrl: ticketUrl(ticket.id) };
      await sendMail(
        ticket.requester.email,
        renderTemplate(settings.statusChangedEmailSubject, vars),
        renderTemplate(settings.statusChangedEmailBody, vars)
      );
    }
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/dashboard");
}
