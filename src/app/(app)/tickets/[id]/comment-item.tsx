"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { deleteComment, editComment, type EditCommentState } from "@/app/actions/tickets";
import { renderWithMentions } from "@/lib/render-mentions";
import { LocalTime } from "@/app/local-time";
import { AttachmentList } from "./attachment-list";

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
    author: { name: string };
    deletedBy: { name: string } | null;
    attachments: { id: string; filename: string; sizeBytes: number; mimeType: string }[];
  };
  currentUserId: string;
  isAdmin: boolean;
  mentionableNames: string[];
};

export function CommentItem({ comment, currentUserId, isAdmin, mentionableNames }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const editAction = editComment.bind(null, comment.id);
  const [editState, editFormAction, editPending] = useActionState<EditCommentState, FormData>(editAction, undefined);

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

  if (comment.deletedAt) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm italic text-gray-400 dark:border-gray-700 dark:bg-gray-900/40">
        Commento rimosso da {comment.deletedBy?.name ?? "—"} il <LocalTime date={comment.deletedAt} />
      </div>
    );
  }

  const isOwn = comment.authorId === currentUserId;
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

  return (
    <div
      className={`rounded-xl border p-4 text-sm shadow-sm ${
        comment.internal ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium text-gray-700">
          {comment.author.name}
          {comment.internal && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Nota interna
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {comment.editedAt && <span className="text-gray-400">(modificato)</span>}
          <LocalTime date={comment.createdAt} />
        </div>
      </div>

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
        <p className="max-w-prose whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
          {renderWithMentions(comment.body, mentionableNames)}
        </p>
      )}

      {comment.attachments.length > 0 && (
        <div className="mt-2">
          <AttachmentList attachments={comment.attachments} />
        </div>
      )}

      {!editing && (canEdit || canDelete) && (
        <div className="mt-2 flex items-center gap-3 text-xs">
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
  );
}
