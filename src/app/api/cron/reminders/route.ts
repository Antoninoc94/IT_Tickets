import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, ticketUrl } from "@/lib/mail";
import { buildEmailHtml } from "@/lib/email-html";
import { getSettings, renderTemplate } from "@/lib/settings";

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
      buildEmailHtml(reminderBody, settings, { ctaUrl: ticketUrl(ticket.id), ctaLabel: "Apri ticket →" })
    );
    sent++;
  }

  return NextResponse.json({ sent });
}
