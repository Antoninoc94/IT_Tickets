"use client";

import { useState, useTransition } from "react";
import { closeTicket } from "@/app/actions/tickets";

export function CloseTicketButton({ ticketId }: { ticketId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    startTransition(async () => {
      const result = await closeTicket(ticketId);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button disabled={isPending} onClick={handleClose} className="btn-secondary">
        {isPending ? "Chiusura..." : "Chiudi ticket"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
