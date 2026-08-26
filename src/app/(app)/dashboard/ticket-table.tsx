"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bulkUpdateStatus, bulkAssign } from "@/app/actions/tickets";
import { LocalTime } from "@/app/local-time";
import {
  priorityBadgeClass,
  priorityLabels,
  statusBadgeClass,
  statusLabels,
} from "@/lib/ticket-labels";
import type { TicketStatus } from "@/generated/prisma/enums";

type SortCol = "updatedAt" | "createdAt" | "title" | "priority" | "status";

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: "asc" | "desc" }) {
  if (sortCol !== col) return <span className="ml-1 text-xs opacity-30">↕</span>;
  return <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

export type TicketRow = {
  id: string;
  title: string;
  requesterName: string;
  assigneeName: string | null;
  priority: string;
  status: string;
  tags: { id: string; name: string; color: string }[];
  updatedAtISO: string;
  unread: boolean;
  slaStatus: "ok" | "warning" | "overdue" | "none";
  slaLabel?: string;
};

export function TicketTable({
  tickets,
  assignees,
  isStaff,
  sortCol,
  sortDir,
  filterSearch,
}: {
  tickets: TicketRow[];
  assignees: { id: string; name: string }[];
  isStaff: boolean;
  sortCol: SortCol;
  sortDir: "asc" | "desc";
  filterSearch: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");

  const allSelected = tickets.length > 0 && selected.size === tickets.length;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(tickets.map((t) => t.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sortHref(col: SortCol) {
    const sp = new URLSearchParams(filterSearch);
    if (sortCol === col) {
      if (sortDir === "desc") { sp.set("dir", "asc"); sp.set("sort", col); }
      else { sp.delete("dir"); sp.set("sort", col); }
    } else {
      sp.set("sort", col);
      sp.delete("dir");
    }
    if (sp.get("sort") === "updatedAt" && !sp.has("dir")) sp.delete("sort");
    return `/dashboard?${sp.toString()}`;
  }

  function handleBulkStatus(status: TicketStatus) {
    const ids = [...selected];
    startTransition(async () => {
      await bulkUpdateStatus(ids, status);
      setSelected(new Set());
    });
  }

  function handleBulkAssign() {
    if (!bulkAssigneeId) return;
    const ids = [...selected];
    const effectiveId = bulkAssigneeId === "__none__" ? null : bulkAssigneeId;
    startTransition(async () => {
      await bulkAssign(ids, effectiveId);
      setSelected(new Set());
      setBulkAssigneeId("");
    });
  }

  return (
    <div>
      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-xl">
          <span className="font-semibold text-gray-700">{selected.size} selezionat{selected.size === 1 ? "o" : "i"}</span>
          <div className="h-4 w-px bg-gray-200" />
          {isStaff && (
            <>
              <button onClick={() => handleBulkStatus("IN_PROGRESS")} disabled={isPending} className="btn-ghost py-1 text-xs">
                In lavorazione
              </button>
              <button onClick={() => handleBulkStatus("RESOLVED")} disabled={isPending} className="btn-ghost py-1 text-xs">
                Risolvi
              </button>
              <button onClick={() => handleBulkStatus("CLOSED")} disabled={isPending} className="btn-ghost py-1 text-xs">
                Chiudi
              </button>
              <div className="h-4 w-px bg-gray-200" />
              <select
                value={bulkAssigneeId}
                onChange={(e) => setBulkAssigneeId(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none"
              >
                <option value="">Assegna a…</option>
                <option value="__none__">— Rimuovi assegnazione</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={isPending || !bulkAssigneeId}
                className="btn-primary py-1 text-xs"
              >
                Assegna
              </button>
            </>
          )}
          <button onClick={() => setSelected(new Set())} className="ml-1 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="table-header">
            <tr>
              {isStaff && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]"
                  />
                </th>
              )}
              <th className="px-4 py-3">
                <Link href={sortHref("title")} className="inline-flex items-center hover:text-gray-900">
                  Titolo<SortIcon col="title" sortCol={sortCol} sortDir={sortDir} />
                </Link>
              </th>
              <th className="hidden px-4 py-3 sm:table-cell">Richiedente</th>
              <th className="hidden px-4 py-3 sm:table-cell">Assegnato a</th>
              <th className="hidden px-4 py-3 sm:table-cell">
                <Link href={sortHref("priority")} className="inline-flex items-center hover:text-gray-900">
                  Priorità<SortIcon col="priority" sortCol={sortCol} sortDir={sortDir} />
                </Link>
              </th>
              <th className="px-4 py-3">
                <Link href={sortHref("status")} className="inline-flex items-center hover:text-gray-900">
                  Stato<SortIcon col="status" sortCol={sortCol} sortDir={sortDir} />
                </Link>
              </th>
              <th className="hidden px-4 py-3 text-right sm:table-cell">
                <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                  <Link href={sortHref("createdAt")} className="inline-flex items-center hover:text-gray-900">
                    Creato<SortIcon col="createdAt" sortCol={sortCol} sortDir={sortDir} />
                  </Link>
                  <span className="opacity-40">/</span>
                  <Link href={sortHref("updatedAt")} className="inline-flex items-center hover:text-gray-900">
                    Modifica<SortIcon col="updatedAt" sortCol={sortCol} sortDir={sortDir} />
                  </Link>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const isSelected = selected.has(ticket.id);
              return (
                <tr
                  key={ticket.id}
                  className={`table-row${ticket.unread ? " bg-[color-mix(in_srgb,var(--brand)_4%,transparent)]" : ""}${isSelected ? " !bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]" : ""}`}
                >
                  {isStaff && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(ticket.id)}
                        className="rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {ticket.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" title="Nuova attività" />
                      )}
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className={`link-brand${ticket.unread ? " font-semibold" : ""}`}
                      >
                        {ticket.title}
                      </Link>
                    </div>
                    {/* Mobile: priority + requester shown inline */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
                      <span className={`badge text-[10px] ${priorityBadgeClass[ticket.priority as keyof typeof priorityBadgeClass]}`}>
                        {priorityLabels[ticket.priority as keyof typeof priorityLabels]}
                      </span>
                      <span className="text-xs text-gray-500">{ticket.requesterName}</span>
                    </div>
                    {ticket.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ticket.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: tag.color + "22", color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{ticket.requesterName}</td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{ticket.assigneeName ?? "—"}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`badge ${priorityBadgeClass[ticket.priority as keyof typeof priorityBadgeClass]}`}>
                      {priorityLabels[ticket.priority as keyof typeof priorityLabels]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`badge ${statusBadgeClass[ticket.status as keyof typeof statusBadgeClass]}`}>
                        {statusLabels[ticket.status as keyof typeof statusLabels]}
                      </span>
                      {ticket.slaStatus === "overdue" && (
                        <span className="badge bg-red-100 text-red-700">⚠ {ticket.slaLabel}</span>
                      )}
                      {ticket.slaStatus === "warning" && (
                        <span className="badge bg-amber-100 text-amber-700">⏱ {ticket.slaLabel}</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-xs text-gray-400 tabular-nums sm:table-cell">
                    <LocalTime date={ticket.updatedAtISO} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
