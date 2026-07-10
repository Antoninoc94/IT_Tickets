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

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: true,
      assignee: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
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

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-2 flex items-start justify-between gap-4">
          <h1 className="text-lg font-semibold text-gray-900">{ticket.title}</h1>
          <div className="flex shrink-0 gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeClass[ticket.priority]}`}>
              {priorityLabels[ticket.priority]}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[ticket.status]}`}>
              {statusLabels[ticket.status]}
            </span>
          </div>
        </div>
        <p className="mb-4 whitespace-pre-wrap text-sm text-gray-700">{ticket.description}</p>
        <dl className="grid grid-cols-3 gap-2 text-xs text-gray-500">
          <div>
            <dt className="font-medium text-gray-400">Richiedente</dt>
            <dd>{ticket.requester.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-400">Categoria</dt>
            <dd>{categoryLabels[ticket.category]}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-400">Assegnato a</dt>
            <dd>{ticket.assignee?.name ?? "Non assegnato"}</dd>
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

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Commenti</h2>
        {visibleComments.length === 0 && <p className="text-sm text-gray-500">Nessun commento.</p>}
        {visibleComments.map((comment) => (
          <div
            key={comment.id}
            className={`rounded-lg border p-3 text-sm ${
              comment.internal ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
            }`}
          >
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium text-gray-700">
                {comment.author.name}
                {comment.internal && " · nota interna"}
              </span>
              <span>{comment.createdAt.toLocaleString("it-IT")}</span>
            </div>
            <p className="whitespace-pre-wrap text-gray-800">{comment.body}</p>
          </div>
        ))}
      </div>

      <CommentForm ticketId={ticket.id} canWriteInternal={isStaff} />
    </div>
  );
}
