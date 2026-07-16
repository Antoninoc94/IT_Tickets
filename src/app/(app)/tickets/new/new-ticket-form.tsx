"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createTicket } from "@/app/actions/tickets";
import { priorityLabels } from "@/lib/ticket-labels";
import type { TicketPriority } from "@/generated/prisma/enums";

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

type Tag = { id: string; name: string; color: string };
type CategoryOption = { id: string; name: string; color: string };
type Template = {
  id: string;
  name: string;
  title: string;
  description: string;
  categoryId: string | null;
  priority: TicketPriority | null;
};
type User = { id: string; name: string };

export function NewTicketForm({
  tags,
  templates,
  allUsers,
  currentUserId,
  isStaff,
  parentTicket,
  categories,
}: {
  tags: Tag[];
  templates: Template[];
  allUsers: User[];
  currentUserId: string;
  isStaff: boolean;
  parentTicket: { id: string; title: string } | null;
  categories: CategoryOption[];
}) {
  const [state, action, pending] = useActionState(createTicket, undefined);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [requesterMode, setRequesterMode] = useState<"registered" | "freetext">("registered");

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function applyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (tpl.title) setTitle(tpl.title);
    if (tpl.description) setDescription(tpl.description);
    if (tpl.categoryId) setCategory(tpl.categoryId);
    if (tpl.priority) setPriority(tpl.priority);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="page-title">Nuovo ticket</h1>
        <p className="page-subtitle">Descrivi il problema, il team IT lo prenderà in carico al più presto.</p>
      </div>

      {parentTicket && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          <span>Collegato a: <strong>{parentTicket.title}</strong></span>
        </div>
      )}

      <form action={action} className="card space-y-5 p-6">
        {parentTicket && <input type="hidden" name="parentTicketId" value={parentTicket.id} />}
        {isStaff && templates.length > 0 && (
          <div>
            <label className="field-label">Usa modello (opzionale)</label>
            <select
              defaultValue=""
              onChange={(e) => { applyTemplate(e.target.value); e.target.value = ""; }}
              className="field-input"
            >
              <option value="" disabled>— Seleziona un modello —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {isStaff && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="field-label mb-0">Per conto di</label>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setRequesterMode("registered")}
                  className={`rounded px-2 py-0.5 transition ${requesterMode === "registered" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >
                  Registrato
                </button>
                <button
                  type="button"
                  onClick={() => setRequesterMode("freetext")}
                  className={`rounded px-2 py-0.5 transition ${requesterMode === "freetext" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >
                  Non registrato
                </button>
              </div>
            </div>
            <input type="hidden" name="requesterMode" value={requesterMode} />
            {requesterMode === "registered" ? (
              <select id="requesterId" name="requesterId" defaultValue={currentUserId} className="field-input">
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id === currentUserId ? `${u.name} (io)` : u.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="requesterFreeText"
                placeholder="Nome e Cognome"
                className="field-input"
                required={requesterMode === "freetext"}
              />
            )}
          </div>
        )}

        <div>
          <label htmlFor="title" className="field-label">Titolo</label>
          <input
            id="title"
            name="title"
            required
            placeholder="Es. Stampante ufficio non funziona"
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="description" className="field-label">Descrizione</label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            placeholder="Descrivi cosa succede, da quando e come riprodurlo..."
            className="field-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="categoryId" className="field-label">Categoria</label>
            <select
              id="categoryId"
              name="categoryId"
              required
              className="field-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="" disabled>— Seleziona —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="field-label">Priorità</label>
            <select
              id="priority"
              name="priority"
              required
              className="field-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="" disabled>— Seleziona —</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {isStaff && tags.length > 0 && (
          <div>
            <p className="field-label mb-2">Etichette (opzionale)</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTags.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      active ? "ring-2 ring-offset-1" : "opacity-50 hover:opacity-80"
                    }`}
                    style={active ? { backgroundColor: tag.color + "22", color: tag.color } : {}}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                );
              })}
            </div>
            {[...selectedTags].map((id) => (
              <input key={id} type="hidden" name="tagIds" value={id} />
            ))}
          </div>
        )}

        <div>
          <label htmlFor="files" className="field-label">Allegati (opzionale)</label>
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
