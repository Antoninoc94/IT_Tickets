"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mergeTickets } from "@/app/actions/tickets";
import { statusBadgeClass, statusLabels } from "@/lib/ticket-labels";
import type { TicketStatus } from "@/generated/prisma/enums";

type SimilarTicket = { id: string; title: string; status: TicketStatus };

export function SimilarTickets({ mainId, tickets }: { mainId: string; tickets: SimilarTicket[] }) {
  const router = useRouter();
  const [merging, setMerging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = tickets.filter((t) => !dismissed.has(t.id));
  if (visible.length === 0) return null;

  async function handleMerge(duplicateId: string, duplicateTitle: string) {
    if (!confirm(`Unire il ticket "${duplicateTitle}" in questo? Il ticket duplicato verrà chiuso.`)) return;
    setMerging(duplicateId);
    setError(null);
    const result = await mergeTickets(mainId, duplicateId);
    setMerging(null);
    if (result?.error) {
      setError(result.error);
    } else {
      setDismissed((prev) => new Set([...prev, duplicateId]));
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <p className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        Ticket simili — potenziali duplicati
      </p>
      {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="space-y-2">
        {visible.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <a
                href={`/tickets/${t.id}`}
                className="truncate text-sm font-medium text-amber-800 hover:underline dark:text-amber-200"
              >
                {t.title}
              </a>
              <span className={`badge shrink-0 text-[10px] ${statusBadgeClass[t.status]}`}>
                {statusLabels[t.status]}
              </span>
            </div>
            <button
              type="button"
              disabled={merging === t.id}
              onClick={() => handleMerge(t.id, t.title)}
              className="shrink-0 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900"
            >
              {merging === t.id ? "Unione…" : "Unisci qui"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
