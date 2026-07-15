"use client";

import Link from "next/link";
import { categoryLabels, priorityLabels } from "@/lib/ticket-labels";

type Assignee = { id: string; name: string };

export function ReportFilterBar({
  values,
  assignees,
  hasActiveFilters,
}: {
  values: {
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    priority?: string;
    assigneeId?: string;
  };
  assignees: Assignee[];
  hasActiveFilters: boolean;
}) {
  return (
    <form method="GET" className="card flex flex-wrap items-end gap-3 p-4 no-print">
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

      <div>
        <label className="field-label">Categoria</label>
        <select
          name="category"
          defaultValue={values.category ?? ""}
          className="field-input"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="">Tutte</option>
          {Object.entries(categoryLabels).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Priorità</label>
        <select
          name="priority"
          defaultValue={values.priority ?? ""}
          className="field-input"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="">Tutte</option>
          {Object.entries(priorityLabels).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      {assignees.length > 0 && (
        <div>
          <label className="field-label">Tecnico</label>
          <select
            name="assigneeId"
            defaultValue={values.assigneeId ?? ""}
            className="field-input"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <option value="">Tutti</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" className="btn-secondary">
        Applica
      </button>

      {hasActiveFilters && (
        <Link href="/reports" className="text-sm text-gray-500 hover:text-gray-700">
          Cancella filtri
        </Link>
      )}
    </form>
  );
}
