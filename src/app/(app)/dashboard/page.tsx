import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  priorityBadgeClass,
  priorityLabels,
  statusBadgeClass,
  statusLabels,
} from "@/lib/ticket-labels";
import { pickEnum } from "@/lib/query-params";
import { FilterBar } from "./filter-bar";
import { getSettings } from "@/lib/settings";
import { computeSla, formatRemaining } from "@/lib/sla";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

type SearchParams = {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
  requesterId?: string;
  assigneeId?: string;
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

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(user.role === "USER" ? { requesterId: user.id } : {}),
      ...(isStaff && params.requesterId ? { requesterId: params.requesterId } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(category ? { category } : {}),
      ...(assigneeId ? { assigneeId: assigneeId === "unassigned" ? null : assigneeId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { requester: true, assignee: true },
  });

  const [requesters, assignees] = isStaff
    ? await Promise.all([
        prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        prisma.user.findMany({
          where: { role: { in: ["IT", "ADMIN"] }, active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []];

  const settings = await getSettings();

  const hasActiveFilters = Boolean(
    params.q || params.status || params.priority || params.category || params.requesterId || params.assigneeId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{user.role === "USER" ? "I miei ticket" : "Tutti i ticket"}</h1>
          <p className="page-subtitle">
            {tickets.length === 0
              ? "Nessun ticket presente."
              : `${tickets.length} ticket ${tickets.length === 1 ? "totale" : "totali"}`}
          </p>
        </div>
        <Link href="/tickets/new" className="btn-primary">
          + Nuovo ticket
        </Link>
      </div>

      <FilterBar
        isStaff={isStaff}
        requesters={requesters}
        assignees={assignees}
        currentUserId={user.id}
        values={params}
        hasActiveFilters={hasActiveFilters}
      />

      {tickets.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-900">Nessun ticket qui</p>
          <p className="text-sm text-gray-500">
            {hasActiveFilters ? "Nessun ticket corrisponde ai filtri." : "Crea il primo ticket per iniziare."}
          </p>
        </div>
      ) : (
        <div className="table-shell">
          <table className="w-full text-left text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3">Titolo</th>
                <th className="px-4 py-3">Richiedente</th>
                <th className="px-4 py-3">Assegnato a</th>
                <th className="px-4 py-3">Priorità</th>
                <th className="px-4 py-3">Stato</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="table-row">
                  <td className="px-4 py-3">
                    <Link href={`/tickets/${ticket.id}`} className="link-brand">
                      {ticket.title}
                    </Link>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
