import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  priorityBadgeClass,
  priorityLabels,
  statusBadgeClass,
  statusLabels,
} from "@/lib/ticket-labels";
import { pickEnum } from "@/lib/query-params";
import { FilterBar } from "./filter-bar";
import { getSettings } from "@/lib/settings";
import { LocalTime } from "@/app/local-time";
import { computeSla, formatRemaining } from "@/lib/sla";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

const PAGE_SIZE = 25;

type SearchParams = {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
  requesterId?: string;
  assigneeId?: string;
  tagId?: string;
  page?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  const isStaff = user.role !== "USER";
  const params = await searchParams;

  const status = pickEnum<TicketStatus>(params.status, Object.keys(statusLabels) as TicketStatus[]);
  const priority = pickEnum<TicketPriority>(params.priority, Object.keys(priorityLabels) as TicketPriority[]);
  const category = pickEnum<TicketCategory>(params.category, ["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"]);
  const q = params.q?.trim();
  const assigneeId = isStaff && params.assigneeId ? (params.assigneeId === "me" ? user.id : params.assigneeId) : undefined;
  const tagId = params.tagId || undefined;

  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(user.role === "USER" ? { requesterId: user.id } : {}),
    ...(isStaff && params.requesterId ? { requesterId: params.requesterId } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
    ...(assigneeId ? { assigneeId: assigneeId === "unassigned" ? null : assigneeId } : {}),
    ...(tagId ? { tags: { some: { id: tagId } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [tickets, total, myAssigned, unreadRows] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
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

  const [requesters, assignees, allTags] = isStaff
    ? await Promise.all([
        prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        prisma.user.findMany({
          where: { role: "IT", active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.tag.findMany({ orderBy: { name: "asc" } }),
      ])
    : [[], [], []];

  const settings = await getSettings();
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const hasActiveFilters = Boolean(
    params.q || params.status || params.priority || params.category || params.requesterId || params.assigneeId || params.tagId
  );

  const exportParams = new URLSearchParams();
  if (params.q) exportParams.set("q", params.q);
  if (params.status) exportParams.set("status", params.status);
  if (params.priority) exportParams.set("priority", params.priority);
  if (params.category) exportParams.set("category", params.category);
  if (params.requesterId) exportParams.set("requesterId", params.requesterId);
  if (params.assigneeId) exportParams.set("assigneeId", params.assigneeId);
  if (params.tagId) exportParams.set("tagId", params.tagId);
  const exportHref = `/api/tickets/export?${exportParams.toString()}`;

  function pageHref(p: number) {
    const sp = new URLSearchParams(exportParams);
    if (p > 1) sp.set("page", String(p));
    return `/dashboard?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{user.role === "USER" ? "I miei ticket" : "Tutti i ticket"}</h1>
          <p className="page-subtitle">
            {total === 0
              ? "Nessun ticket presente."
              : `${total} ticket ${total === 1 ? "totale" : "totali"}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
                  <span className="text-xs text-gray-400">{t.requester.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {t.tags.map((tag) => (
                    <span key={tag.id} className="hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-block" style={{ backgroundColor: tag.color + "22", color: tag.color }}>{tag.name}</span>
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
          <div className="table-shell">
            <table className="w-full text-left text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3">Titolo</th>
                  <th className="px-4 py-3">Richiedente</th>
                  <th className="px-4 py-3">Assegnato a</th>
                  <th className="px-4 py-3">Priorità</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3 text-right">Ultima modifica</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const unread = unreadIds.has(ticket.id);
                  return (
                  <tr key={ticket.id} className={`table-row${unread ? " bg-[color-mix(in_srgb,var(--brand)_4%,transparent)]" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" title="Nuova attività" />
                        )}
                        <Link href={`/tickets/${ticket.id}`} className={`link-brand${unread ? " font-semibold" : ""}`}>
                          {ticket.title}
                        </Link>
                      </div>
                      {ticket.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ticket.tags.map((tag) => (
                            <span key={tag.id} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: tag.color + "22", color: tag.color }}>{tag.name}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ticket.requester.name}</td>
                    <td className="px-4 py-3 text-gray-600">{ticket.assignee?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${priorityBadgeClass[ticket.priority]}`}>
                        {priorityLabels[ticket.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`badge ${statusBadgeClass[ticket.status]}`}>
                          {statusLabels[ticket.status]}
                        </span>
                        {(() => {
                          const sla = computeSla(ticket, settings);
                          if (sla.status === "overdue") return <span className="badge bg-red-100 text-red-700">⚠ {formatRemaining(sla.remainingMs!)}</span>;
                          if (sla.status === "warning") return <span className="badge bg-amber-100 text-amber-700">⏱ {formatRemaining(sla.remainingMs!)}</span>;
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400 tabular-nums">
                      <LocalTime date={ticket.updatedAt} />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn-ghost">← Precedente</Link>
              ) : (
                <span className="btn-ghost cursor-default opacity-40">← Precedente</span>
              )}
              <span className="text-gray-500">Pagina {page} di {totalPages}</span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="btn-ghost">Successiva →</Link>
              ) : (
                <span className="btn-ghost cursor-default opacity-40">Successiva →</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
