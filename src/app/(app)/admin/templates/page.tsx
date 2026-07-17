import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { TemplatesManager } from "./templates-manager";

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  if (user.role === "USER") redirect("/dashboard");

  const [templates, categories] = await Promise.all([
    prisma.ticketTemplate.findMany({
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Modelli ticket</h1>
        <p className="page-subtitle">Crea modelli per pre-compilare i campi quando si apre un nuovo ticket.</p>
      </div>
      <TemplatesManager templates={templates} categories={categories} />
    </div>
  );
}
