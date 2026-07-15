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
import { getSettings } from "@/lib/settings";
import { computeSla, formatRemaining } from "@/lib/sla";
import { AttachmentList } from "./attachment-list";
import { DeleteTicketButton } from "./delete-ticket-button";
import { CloseTicketButton } from "./close-ticket-button";
import { ReopenTicketButton } from "./reopen-ticket-button";
import { TicketHistory } from "./ticket-history";
import { LocalTime } from "@/app/local-time";
import { renderWithMentions } from "@/lib/render-mentions";
import { ViewTracker } from "./view-tracker";
import { TagEditor } from "./tag-editor";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: true,
      assignee: true,
      tags: true,
      parent: { select: { id: true, title: true, status: true } },
      children: { select: { id: true, title: true, status: true }, orderBy: { createdAt: "asc" } },
      attachments: { where: { commentId: null }, orderBy: { createdAt: "asc" } },
      comments: {
        include: { author: true, attachments: true },
        orderBy: { createdAt: "asc" },
      },
      events: {
        include: { actor: { select: { name: true } } },
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
        where: { role: "IT", active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const mentionableNames = [
    ...itUsers.map((u) => u.name),
    ticket.requester.name,
    ...(ticket.assignee ? [ticket.assignee.name] : []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const [settings, cannedResponses, allTags] = await Promise.all([
    getSettings(),
    isStaff ? prisma.cannedResponse.findMany({ orderBy: { title: "asc" } }) : Promise.resolve([]),
    isStaff ? prisma.tag.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  const sla = computeSla(ticket, settings);

  const canDelete = isStaff || (ticket.requesterId === user.id && ticket.status === "OPEN");
  const canClose = ticket.status !== "CLOSED" && (isStaff || (ticket.requesterId === user.id && ticket.status === "OPEN"));
  const canReopen = ticket.status === "CLOSED" && isStaff;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ViewTracker ticketId={id} />
      <div className="card p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{ticket.title}</h1>
          <div className="flex shrink-0 flex-wrap gap-2">
            <span className={`badge ${priorityBadgeClass[ticket.priority]}`}>{priorityLabels[ticket.priority]}</span>
            <span className={`badge ${statusBadgeClass[ticket.status]}`}>{statusLabels[ticket.status]}</span>
            {sla.status === "overdue" && <span className="badge bg-red-100 text-red-700">⚠ {formatRemaining(sla.remainingMs!)}</span>}
            {sla.status === "warning" && <span className="badge bg-amber-100 text-amber-700">⏱ {formatRemaining(sla.remainingMs!)}</span>}
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
            <dd className="mt-0.5 text-gray-900">{ticket.requesterLabel ?? ticket.requester.name}</dd>
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

      {ticket.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ticket.tags.map((tag) => (
            <span key={tag.id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: tag.color + "22", color: tag.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {isStaff && allTags.length > 0 && (
        <TagEditor ticketId={ticket.id} allTags={allTags} currentTagIds={ticket.tags.map((t) => t.id)} />
      )}

      {isStaff && (
        <TicketControls
          ticketId={ticket.id}
          status={ticket.status}
          priority={ticket.priority}
          category={ticket.category}
          assigneeId={ticket.assigneeId}
          itUsers={itUsers}
        />
      )}

      {(ticket.parent || ticket.children.length > 0) && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
          <p className="mb-2 font-medium text-blue-900">Cronologia ticket</p>
          {ticket.parent && (
            <div className="mb-1 flex items-center gap-2 text-blue-800">
              <span className="text-xs text-blue-500">Padre</span>
              <a href={`/tickets/${ticket.parent.id}`} className="font-medium hover:underline">
                {ticket.parent.title}
              </a>
              <span className={`badge text-[10px] ${statusBadgeClass[ticket.parent.status]}`}>
                {statusLabels[ticket.parent.status]}
              </span>
            </div>
          )}
          {ticket.children.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-blue-500">Ticket correlati</span>
              {ticket.children.map((child) => (
                <div key={child.id} className="flex items-center gap-2 text-blue-800">
                  <a href={`/tickets/${child.id}`} className="font-medium hover:underline">
                    {child.title}
                  </a>
                  <span className={`badge text-[10px] ${statusBadgeClass[child.status]}`}>
                    {statusLabels[child.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(canClose || canDelete || canReopen || (!isStaff && ticket.status === "CLOSED" && ticket.requesterId === user.id)) && (
        <div className="flex items-center justify-end gap-3">
          {canReopen && <ReopenTicketButton ticketId={ticket.id} />}
          {!isStaff && ticket.status === "CLOSED" && ticket.requesterId === user.id && (
            <a href={`/tickets/new?parentId=${ticket.id}`} className="btn-secondary text-sm">
              Apri ticket correlato
            </a>
          )}
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
              <LocalTime date={comment.createdAt} />
            </div>
            <p className="whitespace-pre-wrap text-gray-800">{renderWithMentions(comment.body, mentionableNames)}</p>
            {comment.attachments.length > 0 && (
              <div className="mt-2">
                <AttachmentList attachments={comment.attachments} />
              </div>
            )}
          </div>
        ))}
      </div>

      <TicketHistory events={ticket.events} />

      {ticket.status === "CLOSED" && !isStaff ? (
        <p className="text-center text-sm text-gray-400">Il ticket è chiuso. Non è possibile aggiungere nuovi commenti.</p>
      ) : (
        <CommentForm ticketId={ticket.id} canWriteInternal={isStaff} cannedResponses={cannedResponses} mentionableUsers={itUsers} />
      )}
    </div>
  );
}
