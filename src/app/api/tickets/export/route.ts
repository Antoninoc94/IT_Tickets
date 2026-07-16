import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { pickEnum } from "@/lib/query-params";
import { statusLabels, priorityLabels } from "@/lib/ticket-labels";
import type { TicketPriority, TicketStatus } from "@/generated/prisma/enums";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const isStaff = user.role !== "USER";
  const sp = new URL(request.url).searchParams;

  const status   = pickEnum<TicketStatus>(sp.get("status") ?? undefined, Object.keys(statusLabels) as TicketStatus[]);
  const priority = pickEnum<TicketPriority>(sp.get("priority") ?? undefined, Object.keys(priorityLabels) as TicketPriority[]);
  const categoryId = sp.get("category") || undefined;
  const q        = sp.get("q")?.trim();
  const tagId    = sp.get("tagId") || undefined;

  const rawAssignee = isStaff && sp.get("assigneeId") ? sp.get("assigneeId")! : undefined;
  const assigneeId  = rawAssignee === "me" ? user.id : rawAssignee;

  const dateFrom = sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined;
  const dateTo   = sp.get("dateTo")   ? new Date(sp.get("dateTo")! + "T23:59:59.999Z") : undefined;

  const requesterParam = isStaff && sp.get("requesterId") ? sp.get("requesterId")! : undefined;
  const isFreeLabel = requesterParam?.startsWith("freetext:");
  const freeLabelFilter = isFreeLabel ? requesterParam!.slice(9) : undefined;
  const requesterIdFilter = !isFreeLabel ? requesterParam : undefined;

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(!isStaff ? { requesterId: user.id } : {}),
      ...(isStaff && requesterIdFilter ? { requesterId: requesterIdFilter } : {}),
      ...(isStaff && freeLabelFilter ? { requesterLabel: freeLabelFilter } : {}),
      ...(status     ? { status }     : {}),
      ...(priority   ? { priority }   : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(assigneeId ? { assigneeId: assigneeId === "unassigned" ? null : assigneeId } : {}),
      ...(tagId ? { tags: { some: { id: tagId } } } : {}),
      ...((dateFrom || dateTo) ? {
        createdAt: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo   ? { lte: dateTo }   : {}),
        },
      } : {}),
      ...(q ? {
        OR: [
          { title:       { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      } : {}),
    },
    include: { requester: true, assignee: true, tags: true, category: true },
    orderBy: { createdAt: "desc" },
  });

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const header = [
    "ID", "Titolo", "Descrizione", "Richiedente", "Assegnato a",
    "Categoria", "Priorità", "Stato", "Etichette",
    "Creato il", "Aggiornato il", "Risolto il", "Chiuso il",
  ];

  const rows = tickets.map((t) =>
    [
      t.id,
      t.title,
      t.description,
      t.requesterLabel ?? t.requester.name,
      t.assignee?.name ?? "",
      t.category.name,
      priorityLabels[t.priority],
      statusLabels[t.status],
      t.tags.map((tag) => tag.name).join("; "),
      t.createdAt.toISOString(),
      t.updatedAt.toISOString(),
      t.resolvedAt?.toISOString() ?? "",
      t.closedAt?.toISOString()   ?? "",
    ].map(esc).join(",")
  );

  const csv  = [header.map(esc).join(","), ...rows].join("\n");
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse("﻿" + csv, {   // BOM for Excel UTF-8
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tickets-${date}.csv"`,
    },
  });
}
