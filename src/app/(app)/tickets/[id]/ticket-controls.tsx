"use client";

import { useState, useTransition } from "react";
import { assignTicket, updateTicketStatus, updateTicketMeta } from "@/app/actions/tickets";
import { statusLabels, priorityLabels } from "@/lib/ticket-labels";
import type { TicketPriority, TicketStatus } from "@/generated/prisma/enums";

type AssigneeOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

export function TicketControls({
  ticketId,
  status,
  priority,
  categoryId,
  categories,
  assigneeId,
  itUsers,
}: {
  ticketId: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: string;
  categories: CategoryOption[];
  assigneeId: string | null;
  itUsers: AssigneeOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const normalizedAssigneeId = assigneeId ?? "";

  // Mirror the server-confirmed props into local state so a select can be
  // updated optimistically; reset it during render (not in an effect) when
  // revalidated props come back with a new value for this same ticket.
  const [prevStatus, setPrevStatus] = useState(status);
  const [curStatus, setCurStatus] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    setCurStatus(status);
  }

  const [prevPriority, setPrevPriority] = useState(priority);
  const [curPriority, setCurPriority] = useState(priority);
  if (priority !== prevPriority) {
    setPrevPriority(priority);
    setCurPriority(priority);
  }

  const [prevCategoryId, setPrevCategoryId] = useState(categoryId);
  const [curCategoryId, setCurCategoryId] = useState(categoryId);
  if (categoryId !== prevCategoryId) {
    setPrevCategoryId(categoryId);
    setCurCategoryId(categoryId);
  }

  const [prevAssigneeId, setPrevAssigneeId] = useState(normalizedAssigneeId);
  const [curAssigneeId, setCurAssigneeId] = useState(normalizedAssigneeId);
  if (normalizedAssigneeId !== prevAssigneeId) {
    setPrevAssigneeId(normalizedAssigneeId);
    setCurAssigneeId(normalizedAssigneeId);
  }

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
          <p className="mt-1 text-xs text-gray-400">Usa “Riapri ticket” per cambiare stato.</p>
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
          value={curCategoryId}
          disabled={isPending}
          onChange={(e) => {
            const val = e.target.value;
            setCurCategoryId(val);
            startTransition(() => updateTicketMeta(ticketId, "category", val));
          }}
          className="field-input"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
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
