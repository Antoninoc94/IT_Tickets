import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { pickEnum } from "@/lib/query-params";
import { statusLabels, priorityLabels, categoryLabels } from "@/lib/ticket-labels";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const isStaff = user.role !== "USER";
  const sp = new URL(request.url).searchParams;

  const status = pickEnum<TicketStatus>(sp.get("status") ?? undefined, Object.keys(statusLabels) as TicketStatus[]);
  const priority = pickEnum<TicketPriority>(sp.get("priority") ?? undefined, Object.keys(priorityLabels) as TicketPriority[]);
  const category = pickEnum<TicketCategory>(sp.get("category") ?? undefined, ["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"]);
  const q = sp.get("q")?.trim();
  const rawAssignee = isStaff && sp.get("assigneeId") ? sp.get("assigneeId")! : undefined;
  const assigneeId = rawAssignee === "me" ? user.id : rawAssignee;

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(!isStaff ? { requesterId: user.id } : {}),
      ...(isStaff && sp.get("requesterId") ? { requesterId: sp.get("requesterId")! } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(category ? { category } : {}),
      ...(assigneeId ? { assigneeId: assigneeId === "unassigned" ? null : assigneeId } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {}),
    },
    include: { requester: true, assignee: true },
    orderBy: { createdAt: "desc" },
  });

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["ID", "Titolo", "Richiedente", "Assegnato a", "Categoria", "Priorità", "Stato", "Creato il", "Risolto il", "Chiuso il"];
  const rows = tickets.map((t) =>
    [
      t.id,
      t.title,
      t.requester.name,
      t.assignee?.name ?? "",
      categoryLabels[t.category],
      priorityLabels[t.priority],
      statusLabels[t.status],
      t.createdAt.toISOString(),
      t.resolvedAt?.toISOString() ?? "",
      t.closedAt?.toISOString() ?? "",
    ].map(esc).join(",")
  );

  const csv = [header.map(esc).join(","), ...rows].join("\n");
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tickets-${date}.csv"`,
    },
  });
}
