"use client";

import { useEffect, useRef } from "react";

const NEAR_BOTTOM_PX = 80;

/**
 * Keeps the comment thread scrolled to the latest message, chat-style —
 * but only auto-scrolls on a new comment if the user was already near the
 * bottom. If they've scrolled up to read older history, a new comment
 * arriving (e.g. via live-refresh) won't yank their scroll position away.
 */
export function CommentsScrollArea({ children, commentCount }: { children: React.ReactNode; commentCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (el && isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [commentCount]);

  return (
    <div
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      }}
      className="max-h-[32rem] space-y-3 overflow-y-auto pr-1"
    >
      {children}
    </div>
  );
}
