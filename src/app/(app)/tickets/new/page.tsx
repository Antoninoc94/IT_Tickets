import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NewTicketForm } from "./new-ticket-form";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ parentId?: string }>;
}) {
  const user = await getCurrentUser();
  const isStaff = user.role !== "USER";
  const { parentId } = await searchParams;

  const [tags, templates, allUsers, parentTicket, categories] = await Promise.all([
    isStaff ? prisma.tag.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    isStaff
      ? prisma.ticketTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, title: true, description: true, categoryId: true, priority: true } })
      : Promise.resolve([]),
    isStaff
      ? prisma.user.findMany({
          where: { active: true, role: { in: ["USER", "IT"] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    parentId
      ? prisma.ticket.findUnique({ where: { id: parentId }, select: { id: true, title: true } })
      : Promise.resolve(null),
    prisma.category.findMany({
      where: { enabled: true },
      orderBy: { position: "asc" },
      include: { customFields: { orderBy: { position: "asc" } } },
    }),
  ]);

  return (
    <NewTicketForm
      tags={tags}
      templates={templates}
      allUsers={allUsers}
      currentUserId={user.id}
      isStaff={isStaff}
      parentTicket={parentTicket ?? null}
      categories={categories}
    />
  );
}
