import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  priorityLabels,
  statusBadgeClass,
  statusLabels,
} from "@/lib/ticket-labels";
import { pickEnum } from "@/lib/query-params";
import { FilterBar } from "./filter-bar";
import { TicketTable, type TicketRow } from "./ticket-table";
import { getSettings } from "@/lib/settings";
import { computeSla, formatRemaining } from "@/lib/sla";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

const PAGE_SIZE = 25;

type SortCol = "updatedAt" | "createdAt" | "title" | "priority" | "status";
const VALID_SORTS: SortCol[] = ["updatedAt", "createdAt", "title", "priority", "status"];

type SearchParams = {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
  requesterId?: string;
  assigneeId?: string;
  tagId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  const isStaff = user.role !== "USER";
  const params = await searchParams;

  const status = pickEnum<TicketStatus>(params.status, Object.keys(statusLabels) as TicketStatus[]);
  const priority = pickEnum<TicketPriority>(params.priority, Object.keys(priorityLabels) as TicketPriority[]);
  const category = pickEnum<TicketCategory>(params.category, ["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"]);
  const q = params.q?.trim();
  const assigneeId = isStaff && params.assigneeId
    ? (params.assigneeId === "me" ? user.id : params.assigneeId)
    : undefined;
  const tagId = params.tagId || undefined;

  const sortCol: SortCol = VALID_SORTS.includes(params.sort as SortCol) ? (params.sort as SortCol) : "updatedAt";
  const sortDir = params.dir === "asc" ? "asc" as const : "desc" as const;

  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? new Date(params.dateTo + "T23:59:59.999Z") : undefined;

  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const orderBy =
    sortCol === "title" ? { title: sortDir } :
    sortCol === "createdAt" ? { createdAt: sortDir } :
    sortCol === "priority" ? { priority: sortDir } :
    sortCol === "status" ? { status: sortDir } :
    { updatedAt: sortDir };

  const requesterParam = isStaff && params.requesterId ? params.requesterId : undefined;
  const isFreeLabel = requesterParam?.startsWith("freetext:");
  const freeLabelFilter = isFreeLabel ? requesterParam!.slice(9) : undefined;
  const requesterIdFilter = !isFreeLabel ? requesterParam : undefined;

  const where = {
    ...(user.role === "USER" ? { requesterId: user.id } : {}),
    ...(isStaff && requesterIdFilter ? { requesterId: requesterIdFilter } : {}),
    ...(isStaff && freeLabelFilter ? { requesterLabel: freeLabelFilter } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
    ...(assigneeId ? { assigneeId: assigneeId === "unassigned" ? null : assigneeId } : {}),
    ...(tagId ? { tags: { some: { id: tagId } } } : {}),
    ...((dateFrom || dateTo) ? {
      createdAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [tickets, total, myAssigned, unreadRows] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: { requester: true, assignee: true, tags: true },
    }),
    prisma.ticket.count({ where }),
    isStaff
      ? prisma.ticket.findMany({
          where: { assigneeId: user.id, status: { notIn: ["CLOSED", "RESOLVED"] } },
          orderBy: { createdAt: "desc" },
          include: { requester: true, tags: true },
          take: 10,
        })
      : Promise.resolve([]),
    prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        SELECT DISTINCT t.id
        FROM "Ticket" t
        WHERE ${user.role === "USER" ? Prisma.sql`t."requesterId" = ${user.id} AND` : Prisma.sql``}
        EXISTS (
          SELECT 1 FROM "Comment" c
          WHERE c."ticketId" = t.id
            AND ${user.role === "USER" ? Prisma.sql`c.internal = false AND` : Prisma.sql``}
            c."createdAt" > COALESCE(
              (SELECT tv."viewedAt" FROM "TicketView" tv
               WHERE tv."userId" = ${user.id} AND tv."ticketId" = t.id),
              '1970-01-01'::timestamptz
            )
            AND c."authorId" != ${user.id}
        )
      `
    ),
  ]);

  const unreadIds = new Set(unreadRows.map((r) => r.id));

  const [registeredRequesters, assignees, allTags, freeLabelRows] = isStaff
    ? await Promise.all([
        prisma.user.findMany({ where: { active: true, role: { in: ["USER", "IT"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        prisma.user.findMany({
          where: { role: "IT", active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.tag.findMany({ orderBy: { name: "asc" } }),
        prisma.ticket.findMany({
          where: { requesterLabel: { not: null } },
          select: { requesterLabel: true },
          distinct: ["requesterLabel"],
          orderBy: { requesterLabel: "asc" },
        }),
      ])
    : [[], [], [], []];

  const requesters = [
    ...(registeredRequesters as { id: string; name: string }[]),
    ...(freeLabelRows as { requesterLabel: string | null }[])
      .filter((r) => r.requesterLabel)
      .map((r) => ({ id: `freetext:${r.requesterLabel!}`, name: `${r.requesterLabel!} (non regist.)` })),
  ];

  const settings = await getSettings();
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const hasActiveFilters = Boolean(
    params.q || params.status || params.priority || params.category ||
    params.requesterId || params.assigneeId || params.tagId ||
    params.dateFrom || params.dateTo
  );

  // Build filter-only search string (for TicketTable sort hrefs)
  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.status) filterParams.set("status", params.status);
  if (params.priority) filterParams.set("priority", params.priority);
  if (params.category) filterParams.set("category", params.category);
  if (params.requesterId) filterParams.set("requesterId", params.requesterId);
  if (params.assigneeId) filterParams.set("assigneeId", params.assigneeId);
  if (params.tagId) filterParams.set("tagId", params.tagId);
  if (params.dateFrom) filterParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) filterParams.set("dateTo", params.dateTo);

  // Base params for export + pagination (filters + sort, no page)
  const baseParams = new URLSearchParams(filterParams);
  if (sortCol !== "updatedAt") baseParams.set("sort", sortCol);
  if (sortDir !== "desc") baseParams.set("dir", sortDir);

  const exportHref = `/api/tickets/export?${baseParams.toString()}`;

  function pageHref(p: number) {
    const sp = new URLSearchParams(baseParams);
    if (p > 1) sp.set("page", String(p));
    return `/dashboard?${sp.toString()}`;
  }

  // Pre-compute SLA for each ticket (server-side)
  const ticketRows: TicketRow[] = tickets.map((ticket) => {
    const sla = computeSla(ticket, settings);
    return {
      id: ticket.id,
      title: ticket.title,
      requesterName: ticket.requesterLabel ?? ticket.requester.name,
      assigneeName: ticket.assignee?.name ?? null,
      priority: ticket.priority,
      status: ticket.status,
      tags: ticket.tags,
      updatedAtISO: ticket.updatedAt.toISOString(),
      unread: unreadIds.has(ticket.id),
      slaStatus: sla.status,
      slaLabel: sla.remainingMs != null ? formatRemaining(sla.remainingMs) : undefined,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">{user.role === "USER" ? "I miei ticket" : "Tutti i ticket"}</h1>
          <p className="page-subtitle">
            {total === 0
              ? "Nessun ticket presente."
              : `${total} ticket ${total === 1 ? "totale" : "totali"}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <a href={exportHref} className="btn-ghost text-sm" download>
            ↓ Esporta CSV
          </a>
          <Link href="/tickets/new" className="btn-primary">
            + Nuovo ticket
          </Link>
        </div>
      </div>

      {isStaff && myAssigned.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            I miei ticket assegnati <span className="ml-1 text-gray-400">({myAssigned.length})</span>
          </h2>
          <ul className="divide-y divide-gray-100">
            {myAssigned.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <a href={`/tickets/${t.id}`} className="link-brand truncate text-sm">{t.title}</a>
                  <span className="text-xs text-gray-400">{t.requesterLabel ?? t.requester.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {t.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-block"
                      style={{ backgroundColor: tag.color + "22", color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                  <span className={`badge ${statusBadgeClass[t.status]}`}>{statusLabels[t.status]}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FilterBar
        isStaff={isStaff}
        requesters={requesters}
        assignees={assignees}
        allTags={allTags}
        currentUserId={user.id}
        values={params}
        hasActiveFilters={hasActiveFilters}
      />

      {total === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-900">Nessun ticket qui</p>
          <p className="text-sm text-gray-500">
            {hasActiveFilters ? "Nessun ticket corrisponde ai filtri." : "Crea il primo ticket per iniziare."}
          </p>
        </div>
      ) : (
        <>
          <TicketTable
            tickets={ticketRows}
            assignees={assignees}
            isStaff={isStaff}
            sortCol={sortCol}
            sortDir={sortDir}
            filterSearch={filterParams.toString()}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 text-sm">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn-ghost px-2 py-1">←</Link>
              ) : (
                <span className="btn-ghost cursor-default opacity-40 px-2 py-1">←</span>
              )}
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-gray-400">…</span>
                ) : (
                  <Link
                    key={p}
                    href={pageHref(p)}
                    className={`min-w-[2rem] rounded px-2 py-1 text-center transition-colors ${
                      p === page
                        ? "bg-[var(--brand)] font-semibold text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="btn-ghost px-2 py-1">→</Link>
              ) : (
                <span className="btn-ghost cursor-default opacity-40 px-2 py-1">→</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
