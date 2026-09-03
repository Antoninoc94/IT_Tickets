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
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handleDelete}
        className="btn-danger w-full"
      >
        {isPending ? "Eliminazione..." : "Elimina ticket"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
