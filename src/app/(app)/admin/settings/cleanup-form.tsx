"use client";

import { useActionState } from "react";
import { cleanupOldAttachments } from "@/app/actions/attachments";

export function CleanupForm() {
  const [state, action, pending] = useActionState(cleanupOldAttachments, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Ticket chiusi da più di</span>
      <input
        type="number"
        name="days"
        defaultValue={90}
        min={1}
        className="field-input w-20 py-1.5 text-center text-sm"
      />
      <span className="text-sm text-gray-600">giorni</span>
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Pulizia in corso..." : "Elimina allegati"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-600">{state.message}</p>}
    </form>
  );
}
