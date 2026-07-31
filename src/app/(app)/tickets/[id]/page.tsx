import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
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
import { SimilarTickets } from "./similar-tickets";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: true,
      assignee: true,
      category: true,
      tags: true,
      parent: { select: { id: true, title: true, status: true } },
      children: { select: { id: true, title: true, status: true }, orderBy: { createdAt: "asc" } },
      mergedInto: { select: { id: true, title: true } },
      attachments: { where: { commentId: null }, orderBy: { createdAt: "asc" } },
      comments: {
        include: { author: true, attachments: true },
        orderBy: { createdAt: "asc" },
      },
      events: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      fieldValues: {
        include: { field: { select: { name: true, position: true } } },
        orderBy: { field: { position: "asc" } },
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

  const titleWords = ticket.title.split(/\s+/).filter((w) => w.length >= 3);
  const [settings, cannedResponses, allTags, categories, similarTickets] = await Promise.all([
    getSettings(),
    isStaff ? prisma.cannedResponse.findMany({ orderBy: { title: "asc" } }) : Promise.resolve([]),
    isStaff ? prisma.tag.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    isStaff ? prisma.category.findMany({ where: { enabled: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    isStaff && titleWords.length > 0 && ticket.status !== "CLOSED" && !ticket.mergedIntoId
      ? prisma.ticket.findMany({
          where: {
            id: { not: ticket.id },
            status: { notIn: ["CLOSED"] },
            mergedIntoId: null,
            OR: titleWords.map((word) => ({ title: { contains: word, mode: "insensitive" as const } })),
          },
          select: { id: true, title: true, status: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
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
            {isStaff && ticket.requester.phone && (
              <dd className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0">
                  <path fillRule="evenodd" d="M3.5 1.5A1.5 1.5 0 0 0 2 3c0 6.075 4.925 11 11 11a1.5 1.5 0 0 0 1.5-1.5v-2.122a1.5 1.5 0 0 0-1.094-1.449l-2.121-.53a1.5 1.5 0 0 0-1.595.541l-.4.5c-.16.2-.427.271-.655.171A8.047 8.047 0 0 1 5.59 6.265c-.1-.228-.03-.495.17-.655l.5-.4A1.5 1.5 0 0 0 6.8 3.615l-.53-2.121A1.5 1.5 0 0 0 4.822 1.5H3.5Z" clipRule="evenodd"/>
                </svg>
                {ticket.requester.phone}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Categoria</dt>
            <dd className="mt-0.5 text-gray-900">{ticket.category.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Assegnato a</dt>
            <dd className="mt-0.5 text-gray-900">{ticket.assignee?.name ?? "Non assegnato"}</dd>
          </div>
        </dl>

        {ticket.fieldValues.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Informazioni aggiuntive</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {ticket.fieldValues.map((fv) => (
                <div key={fv.id}>
                  <dt className="text-xs font-medium text-gray-500">{fv.field.name}</dt>
                  <dd className="mt-0.5 text-gray-900 dark:text-gray-100">{fv.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {ticket.mergedInto && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40">
          <p className="text-gray-600 dark:text-gray-400">
            Questo ticket è stato unito nel ticket principale:{" "}
            <a href={`/tickets/${ticket.mergedInto.id}`} className="font-medium text-[var(--brand)] hover:underline">
              {ticket.mergedInto.title}
            </a>
          </p>
        </div>
      )}

      {isStaff && similarTickets.length > 0 && (
        <SimilarTickets mainId={ticket.id} tickets={similarTickets} />
      )}

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
          categoryId={ticket.categoryId}
          categories={categories}
          assigneeId={ticket.assigneeId}
          itUsers={itUsers}
        />
      )}

      {(ticket.parent || ticket.children.length > 0) && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/40">
          <p className="mb-2 font-medium text-blue-900 dark:text-blue-300">Cronologia ticket</p>
          {ticket.parent && (
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs text-blue-400 dark:text-blue-500">Padre</span>
              <a href={`/tickets/${ticket.parent.id}`} className="font-medium text-blue-800 hover:underline dark:text-blue-300">
                {ticket.parent.title}
              </a>
              <span className={`badge text-[10px] ${statusBadgeClass[ticket.parent.status]}`}>
                {statusLabels[ticket.parent.status]}
              </span>
            </div>
          )}
          {ticket.children.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-blue-400 dark:text-blue-500">Ticket correlati</span>
              {ticket.children.map((child) => (
                <div key={child.id} className="flex items-center gap-2">
                  <a href={`/tickets/${child.id}`} className="font-medium text-blue-800 hover:underline dark:text-blue-300">
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

      {(canClose || canReopen || (!isStaff && ticket.status === "CLOSED" && ticket.requesterId === user.id)) && (
        <div className="flex justify-end gap-3">
          {canReopen && <ReopenTicketButton ticketId={ticket.id} />}
          {!isStaff && ticket.status === "CLOSED" && ticket.requesterId === user.id && (
            <a href={`/tickets/new?parentId=${ticket.id}`} className="btn-secondary text-sm">
              Apri ticket correlato
            </a>
          )}
          {canClose && <CloseTicketButton ticketId={ticket.id} />}
        </div>
      )}
      {canDelete && (
        <div className="flex justify-end">
          <DeleteTicketButton ticketId={ticket.id} />
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
