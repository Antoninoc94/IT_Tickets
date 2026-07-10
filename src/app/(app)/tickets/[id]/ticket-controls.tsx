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
    <div className="card flex flex-wrap gap-6 p-4">
      <div>
        <label className="field-label">Stato</label>
        <select
          defaultValue={status}
          disabled={isPending}
          onChange={(e) => startTransition(() => updateTicketStatus(ticketId, e.target.value as TicketStatus))}
          className="field-input"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Assegnato a</label>
        <select
          defaultValue={assigneeId ?? ""}
          disabled={isPending}
          onChange={(e) => startTransition(() => assignTicket(ticketId, e.target.value))}
          className="field-input"
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
