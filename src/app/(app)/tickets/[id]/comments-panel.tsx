"use client";

import { useState } from "react";
import { CommentsScrollArea } from "./comments-scroll-area";
import { CommentForm } from "./comment-form";

type CannedResponse = { id: string; title: string; body: string };
type MentionUser = { name: string };

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
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
  );
}

/**
 * Collapsible comment thread, styled after ticket-history.tsx's toggle.
 * Also bridges CommentsScrollArea and CommentForm — both client components
 * rendered as siblings here — so that a successful submission can force the
 * comment list to scroll to the bottom even if the user had scrolled up to
 * read older history first.
 */
export function CommentsPanel({
  children,
  commentCount,
  hasUnread,
  ticketId,
  canComment,
  canWriteInternal,
  cannedResponses,
  mentionableUsers,
}: {
  children: React.ReactNode;
  commentCount: number;
  hasUnread: boolean;
  ticketId: string;
  canComment: boolean;
  canWriteInternal: boolean;
  cannedResponses?: CannedResponse[];
  mentionableUsers?: MentionUser[];
}) {
  const [scrollToken, setScrollToken] = useState(0);
  const [expanded, setExpanded] = useState(true);
  // Once the user has expanded the panel this session, an unread badge
  // computed at page load no longer applies — they've seen it.
  const [seen, setSeen] = useState(false);

  function toggle() {
    setExpanded((v) => {
      const next = !v;
      if (next) setSeen(true);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={toggle} className="flex w-full items-center gap-2 text-left">
        <h2 className="text-sm font-semibold text-gray-900">Commenti</h2>
        {commentCount > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            {commentCount}
          </span>
        )}
        {!expanded && !seen && hasUnread && (
          <span
            title="Ci sono commenti non letti"
            className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]"
          />
        )}
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <>
          {commentCount === 0 && <p className="text-sm text-gray-500">Nessun commento.</p>}

          <CommentsScrollArea commentCount={commentCount} forceScrollToken={scrollToken}>
            {children}
          </CommentsScrollArea>

          {canComment ? (
            <CommentForm
              ticketId={ticketId}
              canWriteInternal={canWriteInternal}
              cannedResponses={cannedResponses}
              mentionableUsers={mentionableUsers}
              onSubmitted={() => setScrollToken((t) => t + 1)}
            />
          ) : (
            <p className="text-center text-sm text-gray-400">Il ticket è chiuso. Non è possibile aggiungere nuovi commenti.</p>
          )}
        </>
      )}
    </div>
  );
}
