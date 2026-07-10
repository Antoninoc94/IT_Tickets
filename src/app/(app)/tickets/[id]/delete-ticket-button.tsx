"use client";

import { useState, useTransition } from "react";
import { deleteTicket } from "@/app/actions/tickets";

export function DeleteTicketButton({ ticketId }: { ticketId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm("Eliminare definitivamente questo ticket? L'operazione non è reversibile.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTicket(ticketId);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={isPending}
        onClick={handleDelete}
        className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
      >
        {isPending ? "Eliminazione..." : "Elimina ticket"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
