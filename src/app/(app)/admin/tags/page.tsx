import { getCurrentUser } from "@/lib/dal";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TagsClient } from "./tags-client";

export default async function TagsPage() {
  const user = await getCurrentUser();
  if (user.role === "USER") redirect("/dashboard");

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="page-title">Etichette</h1>
        <p className="page-subtitle">Etichette personalizzabili da applicare ai ticket.</p>
      </div>
      <TagsClient tags={tags} />
    </div>
  );
}
