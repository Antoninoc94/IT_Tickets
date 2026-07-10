"use client";

import { useActionState } from "react";
import { createTicket } from "@/app/actions/tickets";
import { categoryLabels, priorityLabels } from "@/lib/ticket-labels";

export default function NewTicketPage() {
  const [state, action, pending] = useActionState(createTicket, undefined);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="page-title">Nuovo ticket</h1>
        <p className="page-subtitle">Descrivi il problema, il team IT lo prenderà in carico al più presto.</p>
      </div>

      <form action={action} className="card space-y-5 p-6">
        <div>
          <label htmlFor="title" className="field-label">
            Titolo
          </label>
          <input id="title" name="title" required placeholder="Es. Stampante ufficio non funziona" className="field-input" />
        </div>

        <div>
          <label htmlFor="description" className="field-label">
            Descrizione
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            placeholder="Descrivi cosa succede, da quando e come riprodurlo..."
            className="field-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="field-label">
              Categoria
            </label>
            <select id="category" name="category" defaultValue="OTHER" className="field-input">
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="field-label">
              Priorità
            </label>
            <select id="priority" name="priority" defaultValue="MEDIUM" className="field-input">
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Invio in corso..." : "Crea ticket"}
        </button>
      </form>
    </div>
  );
}
