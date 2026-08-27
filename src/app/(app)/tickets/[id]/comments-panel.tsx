"use client";

import { useState } from "react";
import { CommentsScrollArea } from "./comments-scroll-area";
import { CommentForm } from "./comment-form";

type CannedResponse = { id: string; title: string; body: string };
type MentionUser = { name: string };

/**
 * Bridges CommentsScrollArea and CommentForm — both client components
 * rendered as siblings from the server page — so that a successful
 * submission can force the comment list to scroll to the bottom even if the
 * user had scrolled up to read older history first.
 */
export function CommentsPanel({
  children,
  commentCount,
  ticketId,
  canComment,
  canWriteInternal,
  cannedResponses,
  mentionableUsers,
}: {
  children: React.ReactNode;
  commentCount: number;
  ticketId: string;
  canComment: boolean;
  canWriteInternal: boolean;
  cannedResponses?: CannedResponse[];
  mentionableUsers?: MentionUser[];
}) {
  const [scrollToken, setScrollToken] = useState(0);

  return (
    <>
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
  );
}
