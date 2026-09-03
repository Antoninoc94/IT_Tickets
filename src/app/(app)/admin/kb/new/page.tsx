import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { createArticle } from "@/app/actions/kb";
import { ArticleForm } from "../article-form";

export default async function NewKbArticlePage() {
  const user = await getCurrentUser();
  if (user.role === "USER") redirect("/dashboard");

  const categories = await prisma.category.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="mb-1">
          <Link href="/admin/kb" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Knowledge Base
          </Link>
        </div>
        <h1 className="page-title">Nuovo articolo</h1>
        <p className="page-subtitle">Scrivi l&apos;articolo in Markdown e scegli se pubblicarlo subito.</p>
      </div>

      <ArticleForm action={createArticle} categories={categories} />
    </div>
  );
}
