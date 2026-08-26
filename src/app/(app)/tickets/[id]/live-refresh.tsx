"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 15_000;

/**
 * Polls for new activity on this ticket (comments, status/tag/assignment
 * changes) and refreshes the server-rendered data in place when it detects
 * a change — no full page reload, and nothing to do when there's nothing new.
 */
export function LiveRefresh({ ticketId, updatedAtISO }: { ticketId: string; updatedAtISO: string }) {
  const router = useRouter();
  const lastKnown = useRef(updatedAtISO);

  useEffect(() => {
    lastKnown.current = updatedAtISO;
  }, [updatedAtISO]);

  useEffect(() => {
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/tickets/${ticketId}/activity`, { cache: "no-store" });
        if (!res.ok) return;
        const data: { updatedAt?: string } = await res.json();
        if (data.updatedAt && data.updatedAt !== lastKnown.current) {
          lastKnown.current = data.updatedAt;
          router.refresh();
        }
      } catch {
        // Transient network hiccup — just try again on the next tick.
      }
    }

    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [ticketId, router]);

  return null;
}
