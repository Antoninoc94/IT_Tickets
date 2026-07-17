import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./categories-client";

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const categories = await prisma.category.findMany({
    orderBy: { position: "asc" },
    include: {
      _count: { select: { tickets: true } },
      customFields: { orderBy: { position: "asc" } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Categorie</h1>
        <p className="page-subtitle">Aggiungi, rinomina e disabilita le categorie disponibili nei ticket.</p>
      </div>
      <CategoriesClient categories={categories} />
    </div>
  );
}
