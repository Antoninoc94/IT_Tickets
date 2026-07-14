"use client";

import { useActionState } from "react";
import { createTag, deleteTag, type TagState } from "@/app/actions/tags";

type Tag = { id: string; name: string; color: string };

const PRESET_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

function NewTagForm() {
  const [state, action, pending] = useActionState<TagState, FormData>(createTag, undefined);

  return (
    <form action={action} className="card space-y-3 p-4">
      <h2 className="text-sm font-semibold text-gray-900">Nuova etichetta</h2>
      <div className="flex gap-3">
        <input name="name" type="text" required placeholder="Nome etichetta" className="field-input flex-1" />
        <div className="flex items-center gap-1">
          {PRESET_COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={c === PRESET_COLORS[0]} className="sr-only" />
              <span className="block h-6 w-6 rounded-full border-2 border-white ring-1 ring-gray-300 transition hover:scale-110" style={{ backgroundColor: c }} />
            </label>
          ))}
          <input name="color" type="color" defaultValue={PRESET_COLORS[0]} className="h-6 w-6 cursor-pointer rounded border-0 p-0" title="Colore personalizzato" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Salvo..." : "Aggiungi"}
        </button>
      </div>
    </form>
  );
}

export function TagsClient({ tags }: { tags: Tag[] }) {
  return (
    <div className="space-y-6">
      <NewTagForm />
      {tags.length === 0 ? (
        <p className="text-sm text-gray-500">Nessuna etichetta creata.</p>
      ) : (
        <div className="card divide-y divide-gray-100">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="text-sm font-medium text-gray-900">{tag.name}</span>
              </div>
              <button
                type="button"
                onClick={async () => { if (confirm("Eliminare questa etichetta?")) await deleteTag(tag.id); }}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Elimina
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
