"use client";

import { useEffect, useRef, useState, useTransition, useActionState } from "react";
import { deleteComment, editComment, type EditCommentState } from "@/app/actions/tickets";
import { renderWithMentions } from "@/lib/render-mentions";
import { LocalTime } from "@/app/local-time";
import { AttachmentList } from "./attachment-list";
import type { Role } from "@/generated/prisma/enums";

const EDIT_WINDOW_MS = 5 * 60 * 1000;

type CommentItemProps = {
  comment: {
    id: string;
    body: string;
    internal: boolean;
    createdAt: Date;
    editedAt: Date | null;
    deletedAt: Date | null;
    authorId: string;
    author: { name: string; role: Role };
    deletedBy: { name: string } | null;
    attachments: { id: string; filename: string; sizeBytes: number; mimeType: string }[];
  };
  currentUserId: string;
  isAdmin: boolean;
  mentionableNames: string[];
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[1][0] : "";
  return (first + second).toUpperCase();
}

export function CommentItem({ comment, currentUserId, isAdmin, mentionableNames }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editAction = editComment.bind(null, comment.id);
  const [editState, editFormAction, editPending] = useActionState<EditCommentState, FormData>(editAction, undefined);

  // The comment list is a short scrollable box (comments-scroll-area.tsx) —
  // entering edit mode grows this bubble enough that the Save/Cancel buttons
  // can end up clipped below the fold, so bring them into view explicitly.
  useEffect(() => {
    if (editing) containerRef.current?.scrollIntoView({ block: "nearest" });
  }, [editing]);

  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Date.now() is impure, so the edit/delete window can't be computed
  // directly during render — check it client-side after mount instead
  // (briefly hides the buttons on first paint, same tradeoff as
  // theme-toggle.tsx's flash-free init).
  const [withinWindow, setWithinWindow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the clock (an external, impure source), same as theme-toggle.tsx
    setWithinWindow(Date.now() - new Date(comment.createdAt).getTime() <= EDIT_WINDOW_MS);
  }, [comment.createdAt]);

  // Close the edit form once the save actually succeeds — adjusting state
  // during render (not in an effect), same pattern as edit-profile.tsx.
  const [handledSuccess, setHandledSuccess] = useState(editState?.success);
  if (editState?.success !== handledSuccess) {
    setHandledSuccess(editState?.success);
    if (editState?.success) setEditing(false);
  }

  const isOwn = comment.authorId === currentUserId;
  const isStaffAuthor = comment.author.role !== "USER";

  if (comment.deletedAt) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[min(80%,34rem)] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm italic text-gray-400">
          Commento rimosso da {comment.deletedBy?.name ?? "—"} il <LocalTime date={comment.deletedAt} />
        </div>
      </div>
    );
  }

  const canEdit = isOwn && withinWindow;
  const canDelete = (isOwn && withinWindow) || isAdmin;

  function handleDelete() {
    if (!confirm("Eliminare questo commento?")) return;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteComment(comment.id);
      if (result?.error) setDeleteError(result.error);
    });
  }

  const bubbleColor = comment.internal
    ? "border-amber-200 bg-amber-50"
    : isStaffAuthor
      ? "border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
      : "border-gray-200 bg-white";

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {!isOwn && (
        <div
          title={comment.author.name}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
            isStaffAuthor ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
          }`}
        >
          {initials(comment.author.name)}
        </div>
      )}

      <div
        ref={containerRef}
        className={`min-w-0 max-w-[min(80%,34rem)] rounded-2xl border px-4 py-2.5 text-sm shadow-sm ${bubbleColor} ${
          isOwn ? "rounded-br-md" : "rounded-bl-md"
        }`}
      >
        {(!isOwn || comment.internal) && (
          <div className="mb-1 flex items-center gap-2 text-xs">
            {!isOwn && <span className="font-medium text-gray-700">{comment.author.name}</span>}
            {comment.internal && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Nota interna
              </span>
            )}
          </div>
        )}

        {editing ? (
          <form action={editFormAction} className="space-y-2">
            <textarea
              name="body"
              defaultValue={comment.body}
              required
              rows={3}
              className="field-input text-sm"
            />
            <div className="flex items-center gap-2">
              <button type="submit" disabled={editPending} className="btn-primary py-1 text-xs">
                {editPending ? "Salvo..." : "Salva"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary py-1 text-xs">
                Annulla
              </button>
            </div>
            {editState?.error && <p className="text-xs text-red-600">{editState.error}</p>}
          </form>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800">
            {renderWithMentions(comment.body, mentionableNames)}
          </p>
        )}

        {comment.attachments.length > 0 && (
          <div className="mt-2">
            <AttachmentList attachments={comment.attachments} />
          </div>
        )}

        <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-gray-400">
          {comment.editedAt && <span>(modificato)</span>}
          <LocalTime date={comment.createdAt} timeOnly />
        </div>

        {!editing && (canEdit || canDelete) && (
          <div className="mt-1 flex items-center justify-end gap-3 text-xs">
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600">
                Modifica
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Eliminazione..." : "Elimina"}
              </button>
            )}
          </div>
        )}
        {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError}</p>}
      </div>
    </div>
  );
}
