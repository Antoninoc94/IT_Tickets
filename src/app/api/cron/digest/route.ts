import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, ticketUrl } from "@/lib/mail";
import { buildDigestHtml } from "@/lib/email-html";
import { getSettings } from "@/lib/settings";

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
  if (!settings.emailEnabled || !settings.digestEnabled) {
    return NextResponse.json({ skipped: true });
  }

  const openTickets = await prisma.ticket.findMany({
    where: { status: { notIn: ["CLOSED", "RESOLVED"] } },
    include: { requester: { select: { name: true } }, assignee: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (openTickets.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no open tickets" });
  }

  const staff = await prisma.user.findMany({
    where: { role: "IT", active: true },
    select: { email: true },
  });

  const lines = openTickets.map(
    (t) =>
      `[${t.status}] ${t.title} — ${t.requester.name} → ${t.assignee?.name ?? "Non assegnato"}\n${ticketUrl(t.id)}`
  );

  const body = `Riepilogo ticket aperti (${openTickets.length} totali):\n\n${lines.join("\n\n")}`;
  const subject = `Digest giornaliero — ${openTickets.length} ticket aperti`;
  const html = buildDigestHtml(
    openTickets.map((t) => ({
      title: t.title,
      status: t.status,
      requesterName: t.requester.name,
      assigneeName: t.assignee?.name ?? null,
      url: ticketUrl(t.id),
    })),
    settings
  );

  await Promise.all(staff.map((s) => sendMail(s.email, subject, body, html)));

  return NextResponse.json({ sent: staff.length, tickets: openTickets.length });
}
