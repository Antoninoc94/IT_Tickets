import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NewTicketForm } from "./new-ticket-form";

export default async function NewTicketPage() {
  const user = await getCurrentUser();
  const tags = user.role !== "USER"
    ? await prisma.tag.findMany({ orderBy: { name: "asc" } })
    : [];

  return <NewTicketForm tags={tags} />;
}
