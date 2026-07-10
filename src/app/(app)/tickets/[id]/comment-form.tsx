"use client";

import { useActionState } from "react";
import { addComment, type CommentState } from "@/app/actions/tickets";

export function CommentForm({ ticketId, canWriteInternal }: { ticketId: string; canWriteInternal: boolean }) {
  const action = addComment.bind(null, ticketId);
  const [state, formAction, pending] = useActionState<CommentState, FormData>(action, undefined);

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Scrivi un commento..."
        className="field-input"
      />

      <input
        name="files"
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700"
      />

      <div className="flex items-center justify-between">
        {canWriteInternal ? (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" name="internal" className="rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]" />
            Nota interna (non visibile all&apos;utente)
          </label>
        ) : (
          <span />
        )}

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Invio..." : "Commenta"}
        </button>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
