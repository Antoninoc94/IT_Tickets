"use client";

import Link from "next/link";
import { deleteArticle } from "@/app/actions/kb";

type Article = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  views: number;
  author: { name: string };
  category: { name: string } | null;
};

export function KbAdminList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-gray-400">
        Nessun articolo ancora.{" "}
        <Link href="/admin/kb/new" className="link-brand">
          Crea il primo.
        </Link>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-[var(--border)]">
      {articles.map((article) => (
        <div key={article.id} className="flex items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-2 w-2 shrink-0 rounded-full ${article.published ? "bg-green-500" : "bg-gray-300"}`}
                title={article.published ? "Pubblicato" : "Bozza"}
              />
              <p className="truncate text-sm font-medium text-gray-900">{article.title}</p>
            </div>
            <p className="text-xs text-gray-500">
              {article.category?.name ?? "Nessuna categoria"} · {article.author.name} · {article.views} visualizzazioni
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {article.published && (
              <Link href={`/kb/${article.slug}`} target="_blank" className="btn-ghost text-xs">
                Vedi
              </Link>
            )}
            <Link href={`/admin/kb/${article.id}/edit`} className="btn-ghost text-xs">
              Modifica
            </Link>
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Eliminare "${article.title}"?`)) {
                  await deleteArticle(article.id);
                }
              }}
              className="btn-ghost text-xs text-red-500 hover:text-red-700"
            >
              Elimina
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
