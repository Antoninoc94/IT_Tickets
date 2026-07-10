"use client";

import { useActionState } from "react";
import { addComment, type CommentState } from "@/app/actions/tickets";

export function CommentForm({ ticketId, canWriteInternal }: { ticketId: string; canWriteInternal: boolean }) {
  const action = addComment.bind(null, ticketId);
  const [state, formAction, pending] = useActionState<CommentState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Scrivi un commento..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />

      <div className="flex items-center justify-between">
        {canWriteInternal ? (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" name="internal" className="rounded" />
            Nota interna (non visibile all&apos;utente)
          </label>
        ) : (
          <span />
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Invio..." : "Commenta"}
        </button>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
