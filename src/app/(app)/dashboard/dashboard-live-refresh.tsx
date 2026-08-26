"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 20_000;

/**
 * Polls for new ticket activity (new tickets, comments, status/assignment/tag
 * changes) and refreshes the dashboard in place when it detects a change —
 * same filters/sort/page stay intact, since router.refresh() just re-runs
 * the current URL server-side.
 *
 * `paused` should be true while the user has an in-progress bulk selection,
 * so a background refresh can't reshuffle the list out from under them.
 */
export function DashboardLiveRefresh({ paused }: { paused: boolean }) {
  const router = useRouter();
  const lastKnown = useRef<string | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;

    async function poll(isFirst: boolean) {
      if (!isFirst && (pausedRef.current || document.visibilityState !== "visible")) return;
      try {
        const res = await fetch("/api/dashboard/activity", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { updatedAt: string | null } = await res.json();
        if (isFirst) {
          // Just establishes the baseline — the dashboard was already fresh at mount.
          lastKnown.current = data.updatedAt;
          return;
        }
        if (data.updatedAt !== lastKnown.current) {
          lastKnown.current = data.updatedAt;
          router.refresh();
        }
      } catch {
        // Transient network hiccup — just try again on the next tick.
      }
    }

    poll(true);
    const interval = setInterval(() => poll(false), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
