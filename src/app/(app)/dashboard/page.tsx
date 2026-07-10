import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  priorityBadgeClass,
  priorityLabels,
  statusBadgeClass,
  statusLabels,
} from "@/lib/ticket-labels";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const tickets = await prisma.ticket.findMany({
    where: user.role === "USER" ? { requesterId: user.id } : {},
    orderBy: { createdAt: "desc" },
    include: { requester: true, assignee: true },
  });

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

      {tickets.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-900">Nessun ticket qui</p>
          <p className="text-sm text-gray-500">Crea il primo ticket per iniziare.</p>
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
                    <Link href={`/tickets/${ticket.id}`} className="font-medium text-indigo-600 hover:underline">
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
                    <span className={`badge ${statusBadgeClass[ticket.status]}`}>
                      {statusLabels[ticket.status]}
                    </span>
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
