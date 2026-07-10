import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  categoryLabels,
  priorityBadgeClass,
  priorityLabels,
  statusBadgeClass,
  statusLabels,
} from "@/lib/ticket-labels";
import { CommentForm } from "./comment-form";
import { TicketControls } from "./ticket-controls";
import { AttachmentList } from "./attachment-list";
import { DeleteTicketButton } from "./delete-ticket-button";
import { CloseTicketButton } from "./close-ticket-button";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: true,
      assignee: true,
      attachments: { where: { commentId: null }, orderBy: { createdAt: "asc" } },
      comments: {
        include: { author: true, attachments: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) notFound();
  if (user.role === "USER" && ticket.requesterId !== user.id) notFound();

  const isStaff = user.role !== "USER";
  const visibleComments = isStaff ? ticket.comments : ticket.comments.filter((c) => !c.internal);

  const itUsers = isStaff
    ? await prisma.user.findMany({
        where: { role: { in: ["IT", "ADMIN"] }, active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const canDelete = isStaff || (ticket.requesterId === user.id && ticket.status === "OPEN");
  const canClose = ticket.status !== "CLOSED" && (isStaff || ticket.requesterId === user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{ticket.title}</h1>
          <div className="flex shrink-0 gap-2">
            <span className={`badge ${priorityBadgeClass[ticket.priority]}`}>{priorityLabels[ticket.priority]}</span>
            <span className={`badge ${statusBadgeClass[ticket.status]}`}>{statusLabels[ticket.status]}</span>
          </div>
        </div>
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{ticket.description}</p>
        {ticket.attachments.length > 0 && (
          <div className="mb-5">
            <AttachmentList attachments={ticket.attachments} />
          </div>
        )}
        <dl className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Richiedente</dt>
            <dd className="mt-0.5 text-gray-900">{ticket.requester.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Categoria</dt>
            <dd className="mt-0.5 text-gray-900">{categoryLabels[ticket.category]}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Assegnato a</dt>
            <dd className="mt-0.5 text-gray-900">{ticket.assignee?.name ?? "Non assegnato"}</dd>
          </div>
        </dl>
      </div>

      {isStaff && (
        <TicketControls
          ticketId={ticket.id}
          status={ticket.status}
          assigneeId={ticket.assigneeId}
          itUsers={itUsers}
        />
      )}

      {(canClose || canDelete) && (
        <div className="flex items-center justify-end gap-3">
          {canClose && <CloseTicketButton ticketId={ticket.id} />}
          {canDelete && <DeleteTicketButton ticketId={ticket.id} />}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Commenti {visibleComments.length > 0 && <span className="text-gray-400">({visibleComments.length})</span>}
        </h2>
        {visibleComments.length === 0 && <p className="text-sm text-gray-500">Nessun commento.</p>}
        {visibleComments.map((comment) => (
          <div
            key={comment.id}
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
              <span>{comment.createdAt.toLocaleString("it-IT")}</span>
            </div>
            <p className="whitespace-pre-wrap text-gray-800">{comment.body}</p>
            {comment.attachments.length > 0 && (
              <div className="mt-2">
                <AttachmentList attachments={comment.attachments} />
              </div>
            )}
          </div>
        ))}
      </div>

      <CommentForm ticketId={ticket.id} canWriteInternal={isStaff} />
    </div>
  );
}
