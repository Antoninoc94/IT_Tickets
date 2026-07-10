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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          {user.role === "USER" ? "I miei ticket" : "Tutti i ticket"}
        </h1>
        <Link
          href="/tickets/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuovo ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun ticket presente.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Titolo</th>
                <th className="px-4 py-2">Richiedente</th>
                <th className="px-4 py-2">Assegnato a</th>
                <th className="px-4 py-2">Priorità</th>
                <th className="px-4 py-2">Stato</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/tickets/${ticket.id}`} className="font-medium text-blue-700 hover:underline">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{ticket.requester.name}</td>
                  <td className="px-4 py-2 text-gray-600">{ticket.assignee?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeClass[ticket.priority]}`}>
                      {priorityLabels[ticket.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[ticket.status]}`}>
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
