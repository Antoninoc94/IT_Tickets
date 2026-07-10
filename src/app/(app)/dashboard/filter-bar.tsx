"use client";

import Link from "next/link";
import { categoryLabels, priorityLabels, statusLabels } from "@/lib/ticket-labels";

type Option = { id: string; name: string };

function submitOnChange(e: React.ChangeEvent<HTMLSelectElement>) {
  e.currentTarget.form?.requestSubmit();
}

export function FilterBar({
  isStaff,
  requesters,
  assignees,
  currentUserId,
  values,
  hasActiveFilters,
}: {
  isStaff: boolean;
  requesters: Option[];
  assignees: Option[];
  currentUserId: string;
  values: {
    q?: string;
    status?: string;
    priority?: string;
    category?: string;
    requesterId?: string;
    assigneeId?: string;
  };
  hasActiveFilters: boolean;
}) {
  return (
    <form method="GET" className="card flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-[12rem] flex-1">
        <label className="field-label">Cerca</label>
        <input
          type="text"
          name="q"
          defaultValue={values.q}
          placeholder="Titolo o descrizione..."
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label">Stato</label>
        <select name="status" defaultValue={values.status ?? ""} onChange={submitOnChange} className="field-input">
          <option value="">Tutti</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Priorità</label>
        <select name="priority" defaultValue={values.priority ?? ""} onChange={submitOnChange} className="field-input">
          <option value="">Tutte</option>
          {Object.entries(priorityLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Categoria</label>
        <select name="category" defaultValue={values.category ?? ""} onChange={submitOnChange} className="field-input">
          <option value="">Tutte</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isStaff && (
        <>
          <div>
            <label className="field-label">Richiedente</label>
            <select
              name="requesterId"
              defaultValue={values.requesterId ?? ""}
              onChange={submitOnChange}
              className="field-input"
            >
              <option value="">Tutti</option>
              {requesters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Assegnato a</label>
            <select
              name="assigneeId"
              defaultValue={values.assigneeId ?? ""}
              onChange={submitOnChange}
              className="field-input"
            >
              <option value="">Tutti</option>
              <option value="me">Io</option>
              <option value="unassigned">Non assegnato</option>
              {assignees
                .filter((a) => a.id !== currentUserId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
        </>
      )}

      <button type="submit" className="btn-secondary">
        Filtra
      </button>
      {hasActiveFilters && (
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          Cancella filtri
        </Link>
      )}
    </form>
  );
}
