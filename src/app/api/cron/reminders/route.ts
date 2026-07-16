import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, ticketUrl } from "@/lib/mail";
import { buildEmailHtml } from "@/lib/email-html";
import { getSettings, renderTemplate } from "@/lib/settings";
import { statusLabels } from "@/lib/ticket-labels";

function cronAuth(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!cronAuth(request)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const settings = await getSettings();
  if (!settings.emailEnabled || !settings.reminderDays) {
    return NextResponse.json({ skipped: true });
  }

  const cutoff = new Date(Date.now() - settings.reminderDays * 24 * 60 * 60 * 1000);

  // Open tickets with no comment newer than cutoff and with an assignee
  const staleTickets = await prisma.ticket.findMany({
    where: {
      status: { notIn: ["CLOSED", "RESOLVED"] },
      assigneeId: { not: null },
      OR: [
        { comments: { none: {} } },
        { comments: { every: { createdAt: { lt: cutoff } } } },
      ],
      createdAt: { lt: cutoff },
    },
    include: {
      assignee: { select: { email: true, name: true } },
    },
  });

  let sent = 0;
  for (const ticket of staleTickets) {
    if (!ticket.assignee) continue;
    const vars = {
      ticketTitle: ticket.title,
      ticketUrl: ticketUrl(ticket.id),
      days: String(settings.reminderDays),
    };
    const reminderBody = renderTemplate(
      `Il ticket "{{ticketTitle}}" è aperto da più di {{days}} giorni senza aggiornamenti.\n\n{{ticketUrl}}`,
      vars
    );
    await sendMail(
      ticket.assignee.email,
      `Promemoria: ticket in attesa — ${ticket.title}`,
      reminderBody,
      buildEmailHtml(reminderBody, settings, { ctaUrl: ticketUrl(ticket.id), ctaLabel: "Apri ticket →", linkTitle: ticket.title })
    );
    sent++;
  }

  // Auto-close RESOLVED tickets older than autoCloseDays with no recent comments
  let closed = 0;
  if (settings.autoCloseDays) {
    const closeCutoff = new Date(Date.now() - settings.autoCloseDays * 24 * 60 * 60 * 1000);
    const resolvedTickets = await prisma.ticket.findMany({
      where: {
        status: "RESOLVED",
        resolvedAt: { lt: closeCutoff },
        comments: {
          none: { createdAt: { gte: closeCutoff } },
        },
      },
      include: { requester: true },
    });

    for (const ticket of resolvedTickets) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      await prisma.ticketEvent.create({
        data: { ticketId: ticket.id, actorId: null, type: "CLOSED", meta: { auto: true, days: settings.autoCloseDays, from: "RESOLVED" } },
      });
      if (settings.emailEnabled) {
        const vars = { ticketTitle: ticket.title, status: statusLabels.CLOSED, ticketUrl: ticketUrl(ticket.id) };
        const body = renderTemplate(settings.statusChangedEmailBody, vars);
        await sendMail(
          ticket.requester.email,
          renderTemplate(settings.statusChangedEmailSubject, vars),
          body,
          buildEmailHtml(body, settings, { ctaUrl: vars.ticketUrl, ctaLabel: "Apri ticket →", linkTitle: ticket.title })
        );
      }
      closed++;
    }
  }

  return NextResponse.json({ sent, closed });
}
