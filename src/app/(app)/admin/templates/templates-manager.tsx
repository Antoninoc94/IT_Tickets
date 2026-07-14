"use client";

import { useActionState, useTransition } from "react";
import { createTemplate, deleteTemplate, type TemplateState } from "@/app/actions/templates";
import { categoryLabels, priorityLabels } from "@/lib/ticket-labels";
import type { TicketCategory, TicketPriority } from "@/generated/prisma/enums";

type Template = {
  id: string;
  name: string;
  title: string;
  description: string;
  category: TicketCategory | null;
  priority: TicketPriority | null;
};

export function TemplatesManager({ templates }: { templates: Template[] }) {
  const [state, formAction, pending] = useActionState<TemplateState, FormData>(createTemplate, undefined);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Eliminare questo modello?")) return;
    startDelete(async () => {
      await deleteTemplate(id);
    });
  }

  return (
    <>
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Nuovo modello</h2>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="field-label">Nome modello</label>
            <input name="name" required placeholder="Es. Richiesta accesso sistema" className="field-input" />
          </div>
          <div>
            <label className="field-label">Titolo pre-compilato</label>
            <input name="title" placeholder="Titolo che apparirà nel form" className="field-input" />
          </div>
          <div>
            <label className="field-label">Descrizione pre-compilata</label>
            <textarea name="description" rows={3} placeholder="Descrizione che apparirà nel form" className="field-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Categoria</label>
              <select name="category" defaultValue="" className="field-input">
                <option value="">— Nessuna —</option>
                {Object.entries(categoryLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Priorità</label>
              <select name="priority" defaultValue="" className="field-input">
                <option value="">— Nessuna —</option>
                {Object.entries(priorityLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">Modello creato con successo.</p>}
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Salvataggio..." : "Crea modello"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Modelli esistenti{" "}
            <span className="text-gray-400 font-normal">({templates.length})</span>
          </h2>
        </div>
        {templates.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">Nessun modello creato.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {templates.map((tpl) => (
              <li key={tpl.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-gray-900">{tpl.name}</p>
                  {tpl.title && <p className="text-sm text-gray-600">Titolo: <span className="text-gray-900">{tpl.title}</span></p>}
                  {tpl.description && (
                    <p className="max-w-md truncate text-xs text-gray-400">{tpl.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {tpl.category && (
                      <span className="badge bg-gray-100 text-gray-600">
                        {categoryLabels[tpl.category]}
                      </span>
                    )}
                    {tpl.priority && (
                      <span className="badge bg-gray-100 text-gray-600">
                        {priorityLabels[tpl.priority]}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  disabled={isDeleting}
                  className="shrink-0 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  Elimina
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
