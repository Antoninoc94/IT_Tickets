"use client";

import { useState } from "react";
import { LocalTime } from "@/app/local-time";
import { priorityLabels, statusLabels } from "@/lib/ticket-labels";
import type { TicketEventType, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

type EventItem = {
  id: string;
  type: TicketEventType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: any;
  createdAt: Date;
  actor: { name: string } | null;
};

function eventDescription(e: EventItem): string {
  const meta = e.meta ?? {};
  switch (e.type) {
    case "CREATED":
      return "Ticket aperto";
    case "STATUS_CHANGED":
      return `Stato cambiato da "${statusLabels[meta.from as TicketStatus] ?? meta.from}" a "${statusLabels[meta.to as TicketStatus] ?? meta.to}"`;
    case "ASSIGNED":
      return `Assegnato a ${meta.assigneeName ?? "—"}`;
    case "UNASSIGNED":
      return "Assegnazione rimossa";
    case "CLOSED":
      return meta.auto
        ? `Ticket chiuso automaticamente dopo ${meta.days} giorni senza aggiornamenti`
        : "Ticket chiuso";
    case "REOPENED":
      return "Ticket riaperto";
    case "PRIORITY_CHANGED":
      return `Priorità cambiata da "${priorityLabels[meta.from as TicketPriority] ?? meta.from}" a "${priorityLabels[meta.to as TicketPriority] ?? meta.to}"`;
    case "CATEGORY_CHANGED":
      // Categories are admin-defined names (not a fixed enum), so meta.from/to are already display-ready.
      return `Categoria cambiata da "${meta.from}" a "${meta.to}"`;
    case "MERGED":
      return meta.direction === "received"
        ? `Ticket "${meta.duplicateTitle}" unito in questo`
        : `Ticket unito nel ticket "${meta.mainTitle}"`;
  }
}

function eventIcon(type: TicketEventType) {
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ring-white";
  switch (type) {
    case "CREATED":
      return <span className={`${base} bg-blue-100`}><svg className="h-3 w-3 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg></span>;
    case "STATUS_CHANGED":
      return <span className={`${base} bg-gray-100`}><svg className="h-3 w-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/></svg></span>;
    case "ASSIGNED":
      return <span className={`${base} bg-indigo-100`}><svg className="h-3 w-3 text-indigo-600" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg></span>;
    case "UNASSIGNED":
      return <span className={`${base} bg-gray-100`}><svg className="h-3 w-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg></span>;
    case "CLOSED":
      return <span className={`${base} bg-red-100`}><svg className="h-3 w-3 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg></span>;
    case "REOPENED":
      return <span className={`${base} bg-green-100`}><svg className="h-3 w-3 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd"/></svg></span>;
    case "PRIORITY_CHANGED":
    case "CATEGORY_CHANGED":
      return <span className={`${base} bg-yellow-100`}><svg className="h-3 w-3 text-yellow-600" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></span>;
    case "MERGED":
      return <span className={`${base} bg-orange-100`}><svg className="h-3 w-3 text-orange-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm9 4a1 1 0 10-2 0v2.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 9.586V7z" clipRule="evenodd"/></svg></span>;
  }
}

export function TicketHistory({ events }: { events: EventItem[] }) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <h2 className="text-sm font-semibold text-gray-900">Cronologia</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {events.length}
        </span>
        <svg
          viewBox="0 0 16 16"
          width={14}
          height={14}
          fill="currentColor"
          className={`ml-auto shrink-0 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427z" />
        </svg>
      </button>

      {expanded && (
        <ol className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
          {events.map((e, i) => (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                {eventIcon(e.type)}
                {i < events.length - 1 && <div className="mt-1 w-px flex-1 bg-gray-200" />}
              </div>
              <div className="pb-3 pt-0.5">
                <p className="text-sm text-gray-700">{eventDescription(e)}</p>
                <p className="text-xs text-gray-400">
                  {e.actor?.name ?? "Sistema"} · <LocalTime date={e.createdAt} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
