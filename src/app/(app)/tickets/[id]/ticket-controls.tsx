"use client";

import { useEffect, useState, useTransition } from "react";
import { assignTicket, updateTicketStatus, updateTicketMeta } from "@/app/actions/tickets";
import { statusLabels, priorityLabels, categoryLabels } from "@/lib/ticket-labels";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

type AssigneeOption = { id: string; name: string };

export function TicketControls({
  ticketId,
  status,
  priority,
  category,
  assigneeId,
  itUsers,
}: {
  ticketId: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assigneeId: string | null;
  itUsers: AssigneeOption[];
}) {
  const [isPending, startTransition] = useTransition();

  const [curStatus, setCurStatus] = useState(status);
  const [curPriority, setCurPriority] = useState(priority);
  const [curCategory, setCurCategory] = useState(category);
  const [curAssigneeId, setCurAssigneeId] = useState(assigneeId ?? "");

  // Sync controlled state when server re-renders with updated props
  // (e.g. status auto-advances to IN_PROGRESS when an assignee is set)
  useEffect(() => { setCurStatus(status); }, [status]);
  useEffect(() => { setCurPriority(priority); }, [priority]);
  useEffect(() => { setCurCategory(category); }, [category]);
  useEffect(() => { setCurAssigneeId(assigneeId ?? ""); }, [assigneeId]);

  return (
    <div className="card flex flex-wrap gap-6 p-4">
      <div>
        <label className="field-label">Stato</label>
        <select
          value={curStatus}
          disabled={isPending || curStatus === "CLOSED"}
          onChange={(e) => {
            const val = e.target.value as TicketStatus;
            setCurStatus(val);
            startTransition(() => updateTicketStatus(ticketId, val));
          }}
          className="field-input"
        >
          {Object.entries(statusLabels)
            .filter(([value]) => value !== "CLOSED" || curStatus === "CLOSED")
            .map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
        </select>
        {curStatus === "CLOSED" && (
          <p className="mt-1 text-xs text-gray-400">Usa "Riapri ticket" per cambiare stato.</p>
        )}
      </div>

      <div>
        <label className="field-label">Priorità</label>
        <select
          value={curPriority}
          disabled={isPending}
          onChange={(e) => {
            const val = e.target.value;
            setCurPriority(val as TicketPriority);
            startTransition(() => updateTicketMeta(ticketId, "priority", val));
          }}
          className="field-input"
        >
          {Object.entries(priorityLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Categoria</label>
        <select
          value={curCategory}
          disabled={isPending}
          onChange={(e) => {
            const val = e.target.value;
            setCurCategory(val as TicketCategory);
            startTransition(() => updateTicketMeta(ticketId, "category", val));
          }}
          className="field-input"
        >
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Assegnato a</label>
        <select
          value={curAssigneeId}
          disabled={isPending}
          onChange={(e) => {
            const val = e.target.value;
            setCurAssigneeId(val);
            startTransition(() => assignTicket(ticketId, val));
          }}
          className="field-input"
        >
          <option value="">Non assegnato</option>
          {itUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
