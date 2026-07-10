"use client";

import { useTransition } from "react";
import { assignTicket, updateTicketStatus } from "@/app/actions/tickets";
import { statusLabels } from "@/lib/ticket-labels";
import type { TicketStatus } from "@/generated/prisma/enums";

type AssigneeOption = { id: string; name: string };

export function TicketControls({
  ticketId,
  status,
  assigneeId,
  itUsers,
}: {
  ticketId: string;
  status: TicketStatus;
  assigneeId: string | null;
  itUsers: AssigneeOption[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Stato</label>
        <select
          defaultValue={status}
          disabled={isPending}
          onChange={(e) => startTransition(() => updateTicketStatus(ticketId, e.target.value as TicketStatus))}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Assegnato a</label>
        <select
          defaultValue={assigneeId ?? ""}
          disabled={isPending}
          onChange={(e) => startTransition(() => assignTicket(ticketId, e.target.value))}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">Non assegnato</option>
          {itUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
