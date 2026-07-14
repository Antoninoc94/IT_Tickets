"use client";

import Link from "next/link";
import { categoryLabels, priorityLabels, statusLabels } from "@/lib/ticket-labels";

type Option = { id: string; name: string };
type Tag = { id: string; name: string; color: string };

function submitOnChange(e: React.ChangeEvent<HTMLSelectElement>) {
  e.currentTarget.form?.requestSubmit();
}

export function FilterBar({
  isStaff,
  requesters,
  assignees,
  allTags = [],
  currentUserId,
  values,
  hasActiveFilters,
}: {
  isStaff: boolean;
  requesters: Option[];
  assignees: Option[];
  allTags?: Tag[];
  currentUserId: string;
  values: {
    q?: string;
    status?: string;
    priority?: string;
    category?: string;
    requesterId?: string;
    assigneeId?: string;
    tagId?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    dir?: string;
  };
  hasActiveFilters: boolean;
}) {
  return (
    <form method="GET" className="card flex flex-wrap items-end gap-3 p-4">
      {/* Preserve sort state through filter changes */}
      {values.sort && <input type="hidden" name="sort" value={values.sort} />}
      {values.dir && <input type="hidden" name="dir" value={values.dir} />}

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

      {allTags.length > 0 && (
        <div>
          <label className="field-label">Etichetta</label>
          <select name="tagId" defaultValue={values.tagId ?? ""} onChange={submitOnChange} className="field-input">
            <option value="">Tutte</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="field-label">Data da</label>
        <input
          type="date"
          name="dateFrom"
          defaultValue={values.dateFrom ?? ""}
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label">Data a</label>
        <input
          type="date"
          name="dateTo"
          defaultValue={values.dateTo ?? ""}
          className="field-input"
        />
      </div>

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
