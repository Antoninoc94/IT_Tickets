"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { sendMail, ticketUrl } from "@/lib/mail";
import { statusLabels } from "@/lib/ticket-labels";
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

  const ticket = await prisma.ticket.create({
    data: {
      ...validated.data,
      requesterId: user.id,
    },
  });

  const itAndAdmins = await prisma.user.findMany({
    where: { role: { in: ["IT", "ADMIN"] }, active: true },
    select: { email: true },
  });

  await Promise.all(
    itAndAdmins.map((recipient) =>
      sendMail(
        recipient.email,
        `Nuovo ticket: ${ticket.title}`,
        `${user.name} ha aperto un nuovo ticket.\n\n${ticket.description}\n\n${ticketUrl(ticket.id)}`
      )
    )
  );

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
    },
  });

  if (!isInternal && ticket.requesterId !== user.id) {
    await sendMail(
      ticket.requester.email,
      `Nuovo commento sul ticket: ${ticket.title}`,
      `${user.name} ha commentato il tuo ticket.\n\n${validated.data.body}\n\n${ticketUrl(ticket.id)}`
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

  await sendMail(
    ticket.requester.email,
    `Aggiornamento ticket: ${ticket.title}`,
    `Lo stato del tuo ticket è cambiato in "${statusLabels[status]}".\n\n${ticketUrl(ticket.id)}`
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
    await sendMail(
      assignee.email,
      `Ticket assegnato: ${ticket.title}`,
      `Ti è stato assegnato il ticket "${ticket.title}".\n\n${ticketUrl(ticket.id)}`
    );
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/dashboard");
}
