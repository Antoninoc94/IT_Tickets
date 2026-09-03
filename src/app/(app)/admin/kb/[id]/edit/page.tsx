import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { updateArticle } from "@/app/actions/kb";
import { ArticleForm } from "../../article-form";

export default async function EditKbArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (user.role === "USER") redirect("/dashboard");

  const [article, categories] = await Promise.all([
    prisma.kbArticle.findUnique({ where: { id } }),
    prisma.category.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!article) notFound();

  const boundAction = updateArticle.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="mb-1">
          <Link href="/admin/kb" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Knowledge Base
          </Link>
        </div>
        <h1 className="page-title">Modifica articolo</h1>
        <p className="page-subtitle">{article.title}</p>
      </div>

      <ArticleForm
        action={boundAction}
        categories={categories}
        defaultValues={{
          title:      article.title,
          body:       article.body,
          categoryId: article.categoryId,
          published:  article.published,
        }}
      />
    </div>
  );
}
