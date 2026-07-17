"use client";

import { useState, useActionState, useTransition } from "react";
import { createCustomField, deleteCustomField, type CustomFieldState } from "@/app/actions/custom-fields";

export type CustomField = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  hint: string | null;
  options: string | null;
  position: number;
};

const typeLabels: Record<string, string> = {
  text:     "Testo breve",
  textarea: "Testo lungo",
  number:   "Numero",
  select:   "Selezione",
};

function FieldItem({ field }: { field: CustomField }) {
  const [isPending, startTransition] = useTransition();

  const opts =
    field.type === "select" && field.options
      ? (JSON.parse(field.options) as string[])
      : [];

  function handleDelete() {
    if (!confirm(`Eliminare il campo "${field.name}"? I valori già inseriti nei ticket verranno rimossi.`)) return;
    startTransition(async () => {
      await deleteCustomField(field.id);
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{field.name}</span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {typeLabels[field.type] ?? field.type}
          </span>
          {field.required && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
              Obbligatorio
            </span>
          )}
        </div>
        {field.hint && <p className="mt-0.5 text-xs text-gray-400">{field.hint}</p>}
        {opts.length > 0 && (
          <p className="mt-0.5 text-xs text-gray-400">Opzioni: {opts.join(", ")}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
      >
        Elimina
      </button>
    </div>
  );
}

function AddFieldForm({ categoryId }: { categoryId: string }) {
  const action = createCustomField.bind(null, categoryId);
  const [state, formAction, pending] = useActionState<CustomFieldState, FormData>(action, undefined);
  const [type, setType] = useState("text");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-[var(--brand)] hover:underline"
      >
        + Aggiungi campo
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        setOpen(false);
        setType("text");
      }}
      className="space-y-3 rounded-md border border-dashed border-[var(--border)] p-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Nuovo campo</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label text-xs">Nome campo</label>
          <input
            name="name"
            required
            maxLength={80}
            placeholder="es. Numero seriale"
            className="field-input text-sm"
          />
        </div>
        <div>
          <label className="field-label text-xs">Tipo</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="field-input text-sm"
          >
            <option value="text">Testo breve</option>
            <option value="textarea">Testo lungo</option>
            <option value="number">Numero</option>
            <option value="select">Selezione</option>
          </select>
        </div>
      </div>

      <div>
        <label className="field-label text-xs">Testo di aiuto (opzionale)</label>
        <input
          name="hint"
          maxLength={200}
          placeholder="es. Trovalo sull'etichetta sul retro"
          className="field-input text-sm"
        />
      </div>

      {type === "select" && (
        <div>
          <label className="field-label text-xs">Opzioni (una per riga, min. 2)</label>
          <textarea
            name="options"
            required
            rows={3}
            placeholder={"Opzione A\nOpzione B\nOpzione C"}
            className="field-input font-mono text-xs"
          />
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" name="required" className="rounded border-gray-300 text-[var(--brand)]" />
        Campo obbligatorio
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary py-1.5 text-sm">
          {pending ? "Aggiunta..." : "Aggiungi"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setType("text"); }}
          className="btn-secondary py-1.5 text-sm"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

export function CustomFieldsEditor({
  categoryId,
  fields,
}: {
  categoryId: string;
  fields: CustomField[];
}) {
  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="text-xs text-gray-400">
          Nessun campo personalizzato. Aggiungine uno per raccogliere informazioni specifiche da chi apre un ticket in questa categoria.
        </p>
      )}
      {fields.map((f) => (
        <FieldItem key={f.id} field={f} />
      ))}
      <AddFieldForm categoryId={categoryId} />
    </div>
  );
}
