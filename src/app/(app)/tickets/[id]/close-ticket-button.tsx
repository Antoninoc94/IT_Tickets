"use client";

import { useState, useActionState } from "react";
import { closeTicket, type CloseTicketState } from "@/app/actions/tickets";

export function CloseTicketButton({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const action = closeTicket.bind(null, ticketId);
  const [state, formAction, pending] = useActionState<CloseTicketState, FormData>(action, undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        Chiudi ticket
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <p className="text-sm font-medium text-gray-700">Motivo della chiusura</p>
      <form action={formAction} className="space-y-3">
        <textarea
          name="reason"
          required
          rows={2}
          placeholder="Descrivi perché stai chiudendo il ticket..."
          className="field-input"
        />
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Chiusura..." : "Conferma chiusura"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
            Annulla
          </button>
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
