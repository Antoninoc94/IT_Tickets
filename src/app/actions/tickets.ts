"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { sendMail, ticketUrl } from "@/lib/mail";
import { getSettings, renderTemplate } from "@/lib/settings";
import { statusLabels } from "@/lib/ticket-labels";
import { saveUploadedFiles } from "@/lib/attachments";
import type { TicketStatus } from "@/generated/prisma/enums";

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

  const ticket = await prisma.ticket.create({
    data: {
      ...validated.data,
      requesterId: user.id,
      attachments: {
        create: saved.map((f) => ({ ...f, uploadedById: user.id })),
      },
    },
  });

  const itAndAdmins = await prisma.user.findMany({
    where: { role: { in: ["IT", "ADMIN"] }, active: true },
    select: { email: true },
  });

  const settings = await getSettings();
  const vars = {
    ticketTitle: ticket.title,
    ticketDescription: ticket.description,
    requesterName: user.name,
    ticketUrl: ticketUrl(ticket.id),
  };
  const subject = renderTemplate(settings.newTicketEmailSubject, vars);
  const body = renderTemplate(settings.newTicketEmailBody, vars);

  await Promise.all(itAndAdmins.map((recipient) => sendMail(recipient.email, subject, body)));

  redirect(`/tickets/${ticket.id}`);
}

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
    include: { requester: true },
  });
  if (!ticket) {
    return { error: "Ticket non trovato." };
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

  if (!isInternal && ticket.requesterId !== user.id) {
    const settings = await getSettings();
    const vars = {
      ticketTitle: ticket.title,
      authorName: user.name,
      commentBody: validated.data.body,
      ticketUrl: ticketUrl(ticket.id),
    };
    await sendMail(
      ticket.requester.email,
      renderTemplate(settings.newCommentEmailSubject, vars),
      renderTemplate(settings.newCommentEmailBody, vars)
    );
  }

  revalidatePath(`/tickets/${ticketId}`);
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const user = await getCurrentUser();
  if (user.role === "USER") {
    throw new Error("Non autorizzato.");
  }

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : undefined,
      closedAt: status === "CLOSED" ? new Date() : undefined,
    },
    include: { requester: true },
  });

  const settings = await getSettings();
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

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/dashboard");
}

export async function assignTicket(ticketId: string, assigneeId: string) {
  const user = await getCurrentUser();
  if (user.role === "USER") {
    throw new Error("Non autorizzato.");
  }

  const assignee = assigneeId
    ? await prisma.user.findUnique({ where: { id: assigneeId } })
    : null;

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { assigneeId: assigneeId || null },
    include: { requester: true },
  });

  if (assignee) {
    const settings = await getSettings();
    const vars = { ticketTitle: ticket.title, ticketUrl: ticketUrl(ticket.id) };
    await sendMail(
      assignee.email,
      renderTemplate(settings.assignedEmailSubject, vars),
      renderTemplate(settings.assignedEmailBody, vars)
    );
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/dashboard");
}
