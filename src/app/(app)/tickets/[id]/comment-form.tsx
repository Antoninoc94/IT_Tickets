"use client";

import { useState, useRef, useEffect } from "react";
import { useActionState } from "react";
import { addComment, type CommentState } from "@/app/actions/tickets";

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

type CannedResponse = { id: string; title: string; body: string };
type MentionUser = { name: string };

export function CommentForm({
  ticketId,
  canWriteInternal,
  cannedResponses = [],
  mentionableUsers = [],
  onSubmitted,
}: {
  ticketId: string;
  canWriteInternal: boolean;
  cannedResponses?: CannedResponse[];
  mentionableUsers?: MentionUser[];
  onSubmitted?: () => void;
}) {
  const action = addComment.bind(null, ticketId);
  const [state, formAction, pending] = useActionState<CommentState, FormData>(action, undefined);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasPendingRef = useRef(false);

  // Fires once the action settles successfully (pending true -> false with no
  // error), so the comment list can scroll to show the comment we just sent.
  useEffect(() => {
    if (wasPendingRef.current && !pending && !state?.error) {
      onSubmitted?.();
    }
    wasPendingRef.current = pending;
  }, [pending, state, onSubmitted]);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const mentionMatches =
    mentionQuery !== null
      ? mentionableUsers.filter((u) =>
          u.name.toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : [];

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const pos = e.target.selectionStart ?? value.length;
    const textBefore = value.slice(0, pos);
    const match = textBefore.match(/@(\w[\w\s]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(pos - match[0].length);
      setMentionIndex(0);
    } else if (textBefore.match(/@$/)) {
      setMentionQuery("");
      setMentionStart(pos - 1);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
      setMentionStart(null);
    }
  }

  function insertMention(name: string) {
    const ta = textareaRef.current;
    if (!ta || mentionStart === null) return;
    const pos = ta.selectionStart ?? ta.value.length;
    const before = ta.value.slice(0, mentionStart);
    const after = ta.value.slice(pos);
    ta.value = `${before}@${name} ${after}`;
    const newPos = mentionStart + name.length + 2;
    ta.setSelectionRange(newPos, newPos);
    ta.focus();
    setMentionQuery(null);
    setMentionStart(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery === null || mentionMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(mentionMatches[mentionIndex].name);
    } else if (e.key === "Escape") {
      setMentionQuery(null);
      setMentionStart(null);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMentionQuery(null);
        setMentionStart(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function insertCanned(body: string) {
    if (textareaRef.current) {
      textareaRef.current.value = body;
      textareaRef.current.focus();
    }
  }

  return (
    <form action={formAction} className="card space-y-3 p-4">
      {canWriteInternal && cannedResponses.length > 0 && (
        <div>
          <select
            defaultValue=""
            onChange={(e) => {
              const found = cannedResponses.find((r) => r.id === e.target.value);
              if (found) insertCanned(found.body);
              e.target.value = "";
            }}
            className="field-input text-sm"
          >
            <option value="" disabled>Inserisci risposta predefinita...</option>
            {cannedResponses.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          name="body"
          required
          rows={3}
          placeholder={mentionableUsers.length > 0 ? "Scrivi un commento... usa @ per menzionare un utente" : "Scrivi un commento..."}
          className="field-input"
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
        />

        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            {mentionMatches.map((u, i) => (
              <button
                key={u.name}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(u.name); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  i === mentionIndex ? "bg-[var(--brand)] text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="font-medium">@{u.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <input
          name="files"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700"
          onChange={(e) => setFileError(checkFiles(e.target.files))}
        />
        {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
      </div>

      <div className="flex items-center justify-between">
        {canWriteInternal ? (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" name="internal" className="rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]" />
            Nota interna (non visibile all&apos;utente)
          </label>
        ) : (
          <span />
        )}

        <button type="submit" disabled={pending || !!fileError} className="btn-primary">
          {pending ? "Invio..." : "Commenta"}
        </button>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
