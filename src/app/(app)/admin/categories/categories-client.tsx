"use client";

import { useActionState, useTransition, useState } from "react";
import {
  createCategory,
  updateCategory,
  toggleCategory,
  deleteCategory,
  type CategoryState,
} from "@/app/actions/categories";
import { CustomFieldsEditor, type CustomField } from "./custom-fields-editor";

type Category = {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  position: number;
  customFields: CustomField[];
  _count: { tickets: number };
};

function ColorDot({ color }: { color: string }) {
  return <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color }} />;
}

function CategoryRow({ cat }: { cat: Category }) {
  const [editing, setEditing] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [isPending, startTransition] = useTransition();

  const action = updateCategory.bind(null, cat.id);
  const [state, formAction, pending] = useActionState<CategoryState, FormData>(action, undefined);

  function handleToggle() {
    startTransition(() => toggleCategory(cat.id, !cat.enabled));
  }

  function handleDelete() {
    if (!confirm(`Eliminare la categoria "${cat.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteCategory(cat.id);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <li className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {editing ? (
        <div className="p-4">
          <form action={formAction} className="space-y-3" onSubmit={() => setEditing(false)}>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="field-label" htmlFor={`name-${cat.id}`}>Nome</label>
                <input
                  id={`name-${cat.id}`}
                  name="name"
                  required
                  defaultValue={cat.name}
                  maxLength={50}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor={`color-${cat.id}`}>Colore</label>
                <input
                  id={`color-${cat.id}`}
                  name="color"
                  type="color"
                  defaultValue={cat.color}
                  className="h-9 w-14 cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] p-1"
                />
              </div>
            </div>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="btn-primary text-sm">
                {pending ? "Salvo..." : "Salva"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-sm">
                Annulla
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className={`flex items-center gap-3 px-4 py-3 ${!cat.enabled ? "opacity-50" : ""}`}>
            <ColorDot color={cat.color} />
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
            <span className="text-xs text-gray-400">{cat._count.tickets} ticket</span>

            <button
              type="button"
              onClick={() => setShowFields((v) => !v)}
              className={`text-xs font-medium transition ${showFields ? "text-[var(--brand)]" : "text-gray-500 hover:text-gray-700"}`}
            >
              Campi{cat.customFields.length > 0 ? ` (${cat.customFields.length})` : ""}
            </button>

            <button
              type="button"
              onClick={handleToggle}
              disabled={isPending}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {cat.enabled ? "Disabilita" : "Abilita"}
            </button>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Modifica
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending || cat._count.tickets > 0}
              title={cat._count.tickets > 0 ? `${cat._count.tickets} ticket — impossibile eliminare` : "Elimina"}
              className="text-xs text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Elimina
            </button>
          </div>

          {showFields && (
            <div className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Campi personalizzati
              </p>
              <CustomFieldsEditor categoryId={cat.id} fields={cat.customFields} />
            </div>
          )}
        </>
      )}
    </li>
  );
}

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const [createState, createAction, createPending] = useActionState<CategoryState, FormData>(createCategory, undefined);

  return (
    <div className="space-y-6">
      {categories.length > 0 ? (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Nessuna categoria. Creane una qui sotto.</p>
      )}

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Nuova categoria</h2>
        <form action={createAction} className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="field-label" htmlFor="new-name">Nome</label>
              <input
                id="new-name"
                name="name"
                required
                maxLength={50}
                placeholder="Es. Sicurezza"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="new-color">Colore</label>
              <input
                id="new-color"
                name="color"
                type="color"
                defaultValue="#6366f1"
                className="h-9 w-14 cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] p-1"
              />
            </div>
          </div>
          {createState?.error && <p className="text-sm text-red-600">{createState.error}</p>}
          {createState?.success && <p className="text-sm text-green-600">Categoria creata.</p>}
          <button type="submit" disabled={createPending} className="btn-primary">
            {createPending ? "Creazione..." : "Crea categoria"}
          </button>
        </form>
      </div>
    </div>
  );
}
