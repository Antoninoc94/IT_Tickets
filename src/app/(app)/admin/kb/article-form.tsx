"use client";

import { useActionState } from "react";
import { MarkdownEditor } from "./markdown-editor";
import type { KbState } from "@/app/actions/kb";

type Category = { id: string; name: string };

type ArticleFormProps = {
  action: (state: KbState, formData: FormData) => Promise<KbState>;
  categories: Category[];
  defaultValues?: {
    title?: string;
    body?: string;
    categoryId?: string | null;
    published?: boolean;
  };
};

export function ArticleForm({ action, categories, defaultValues = {} }: ArticleFormProps) {
  const [state, formAction, pending] = useActionState<KbState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <div className="card space-y-5 p-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="field-label">Titolo</label>
          <input
            id="title"
            name="title"
            required
            defaultValue={defaultValues.title ?? ""}
            placeholder="Es. Come resettare la password Wi-Fi"
            className="field-input"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="categoryId" className="field-label">Categoria (opzionale)</label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={defaultValues.categoryId ?? ""}
            className="field-input"
          >
            <option value="">— Nessuna categoria —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Published toggle */}
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="published"
            value="true"
            defaultChecked={defaultValues.published ?? false}
            className="h-4 w-4 rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Pubblicato</p>
            <p className="text-xs text-gray-500">Se spuntato, l&apos;articolo è visibile pubblicamente.</p>
          </div>
        </label>
      </div>

      {/* Body */}
      <div>
        <p className="field-label mb-2">Contenuto</p>
        <MarkdownEditor name="body" defaultValue={defaultValues.body ?? ""} />
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex justify-end gap-3">
        <a href="/admin/kb" className="btn-ghost">Annulla</a>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Salvo..." : "Salva articolo"}
        </button>
      </div>
    </form>
  );
}
