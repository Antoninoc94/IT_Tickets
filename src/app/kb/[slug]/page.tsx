import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { peekSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { renderKbMarkdown } from "@/lib/kb-markdown";

export const dynamic = "force-dynamic";

export default async function KbArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getSettings();
  if (!settings.kbEnabled) notFound();

  const article = await prisma.kbArticle.findUnique({
    where: { slug, published: true },
    include: {
      author:   { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!article) notFound();

  // Increment view count (fire-and-forget)
  prisma.kbArticle.update({
    where: { id: article.id },
    data: { views: { increment: 1 } },
  }).catch(() => {});

  const session   = await peekSession();
  const backHref  = session ? "/kb" : "/login";
  const backLabel = session ? "← Torna alla Knowledge Base" : "← Torna al login";

  const bodyHtml = renderKbMarkdown(article.body);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">{settings.appName}</span>
          <Link href={backHref} className="text-sm text-[var(--brand)] hover:opacity-80">
            {backLabel}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/kb" className="hover:text-[var(--brand)]">Knowledge Base</Link>
          {article.category && (
            <>
              <span>/</span>
              <span>{article.category.name}</span>
            </>
          )}
        </nav>

        {/* Header */}
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{article.title}</h1>
          <p className="text-xs text-gray-400">
            Scritto da {article.author.name}
            {" · "}
            {new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(article.updatedAt))}
            {" · "}
            {article.views + 1} visualizzazioni
          </p>
        </div>

        {/* Body */}
        <article
          className="kb-prose"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {/* Footer */}
        <div className="mt-10 border-t border-[var(--border)] pt-6">
          <Link href="/kb" className="text-sm text-[var(--brand)] hover:opacity-80">
            ← Tutti gli articoli
          </Link>
        </div>
      </main>
    </div>
  );
}
