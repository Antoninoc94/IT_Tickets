import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NewTicketForm } from "./new-ticket-form";

export default async function NewTicketPage() {
  const user = await getCurrentUser();
  const isStaff = user.role !== "USER";

  const [tags, templates, allUsers] = isStaff
    ? await Promise.all([
        prisma.tag.findMany({ orderBy: { name: "asc" } }),
        prisma.ticketTemplate.findMany({ orderBy: { name: "asc" } }),
        prisma.user.findMany({
          where: { active: true, role: { in: ["USER", "IT"] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], [], []];

  return (
    <NewTicketForm
      tags={tags}
      templates={templates}
      allUsers={allUsers}
      currentUserId={user.id}
      isStaff={isStaff}
    />
  );
}
