import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { peekSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function KbPage() {
  const settings = await getSettings();
  if (!settings.kbEnabled) notFound();

  const [session, articles] = await Promise.all([
    peekSession(),
    prisma.kbArticle.findMany({
      where: { published: true },
      orderBy: { updatedAt: "desc" },
      include: { category: { select: { name: true, color: true } } },
    }),
  ]);

  const backHref  = session ? "/dashboard" : "/login";
  const backLabel = session ? "← Torna al portale" : "← Torna al login";

  const byCategory = articles.reduce<Record<string, typeof articles>>((acc, a) => {
    const key = a.category?.name ?? "Generale";
    (acc[key] ??= []).push(a);
    return acc;
  }, {});

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

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="page-subtitle">Soluzioni e guide per i problemi più comuni.</p>
        </div>

        {articles.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400">
            Nessun articolo pubblicato ancora. Torna presto!
          </div>
        ) : (
          Object.entries(byCategory).map(([category, items]) => (
            <section key={category} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">{category}</h2>
              <div className="card divide-y divide-[var(--border)]">
                {items.map((article) => (
                  <Link
                    key={article.id}
                    href={`/kb/${article.slug}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-[color-mix(in_srgb,var(--surface)_70%,var(--background))] transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900">{article.title}</span>
                    <span className="ml-4 shrink-0 text-xs text-gray-400">{article.views} visualizzazioni</span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
