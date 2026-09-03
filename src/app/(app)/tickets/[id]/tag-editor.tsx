"use client";

import { useState, useTransition } from "react";
import { setTicketTags } from "@/app/actions/tags";

type Tag = { id: string; name: string; color: string };

export function TagEditor({ ticketId, allTags, currentTagIds }: {
  ticketId: string;
  allTags: Tag[];
  currentTagIds: string[];
}) {
  const [selected, setSelected] = useState(new Set(currentTagIds));
  const [pending, startTransition] = useTransition();

  if (allTags.length === 0) return null;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    startTransition(() => setTicketTags(ticketId, [...next]));
  }

  return (
    <div className="card p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Etichette</p>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const active = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              disabled={pending}
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
    </div>
  );
}
