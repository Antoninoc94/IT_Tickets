"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createTicket } from "@/app/actions/tickets";
import { categoryLabels, priorityLabels } from "@/lib/ticket-labels";

const MAX_FILE_MB = 25;
const MAX_FILES = 5;

function checkFiles(files: FileList | null): string | null {
  if (!files || files.length === 0) return null;
  if (files.length > MAX_FILES) return `Puoi allegare al massimo ${MAX_FILES} file per volta.`;
  for (const file of Array.from(files)) {
    if (file.size > MAX_FILE_MB * 1024 * 1024)
      return `"${file.name}" supera il limite di ${MAX_FILE_MB} MB.`;
  }
  return null;
}

export default function NewTicketPage() {
  const [state, action, pending] = useActionState(createTicket, undefined);
  const [fileError, setFileError] = useState<string | null>(null);

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
            <select id="category" name="category" defaultValue="" required className="field-input">
              <option value="" disabled>— Seleziona —</option>
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
            <select id="priority" name="priority" defaultValue="" required className="field-input">
              <option value="" disabled>— Seleziona —</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="files" className="field-label">
            Allegati (opzionale)
          </label>
          <input
            id="files"
            name="files"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700"
            onChange={(e) => setFileError(checkFiles(e.target.files))}
          />
          <p className="mt-1 text-xs text-gray-400">Immagini o documenti, max 25 MB per file, fino a 5 file.</p>
          {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
        </div>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <button type="submit" disabled={pending || !!fileError} className="btn-primary">
          {pending ? "Invio in corso..." : "Crea ticket"}
        </button>
      </form>
    </div>
  );
}
