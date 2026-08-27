"use client";

import { useEffect, useRef } from "react";

const NEAR_BOTTOM_PX = 80;

/**
 * Keeps the comment thread scrolled to the latest message, chat-style —
 * but only auto-scrolls on a new comment if the user was already near the
 * bottom. If they've scrolled up to read older history, a new comment
 * arriving (e.g. via live-refresh) won't yank their scroll position away.
 *
 * `forceScrollToken` bypasses that check: bump it (e.g. after the user's own
 * comment is posted) to scroll to the bottom regardless of prior position —
 * you always want to see the message you just wrote.
 */
export function CommentsScrollArea({
  children,
  commentCount,
  forceScrollToken = 0,
}: {
  children: React.ReactNode;
  commentCount: number;
  forceScrollToken?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevForceTokenRef = useRef(forceScrollToken);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const forced = forceScrollToken !== prevForceTokenRef.current;
    prevForceTokenRef.current = forceScrollToken;
    if (forced || isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      isNearBottomRef.current = true;
    }
  }, [commentCount, forceScrollToken]);

  return (
    <div
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      }}
      className="max-h-[30vh] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3"
    >
      {children}
    </div>
  );
}
