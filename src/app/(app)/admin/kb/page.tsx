import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { KbAdminList } from "./kb-admin-list";

export default async function AdminKbPage() {
  const user = await getCurrentUser();
  if (user.role === "USER") redirect("/dashboard");

  const articles = await prisma.kbArticle.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      author:   { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="page-subtitle">Gestisci gli articoli della Knowledge Base.</p>
        </div>
        <Link href="/admin/kb/new" className="btn-primary">
          Nuovo articolo
        </Link>
      </div>

      <KbAdminList articles={articles} />
    </div>
  );
}
