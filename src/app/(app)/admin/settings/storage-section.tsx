import { prisma } from "@/lib/prisma";
import { formatBytes } from "@/lib/attachments";
import { CleanupForm } from "./cleanup-form";

export async function StorageSection() {
  const [stats, closedWithAttachments] = await Promise.all([
    prisma.attachment.aggregate({ _sum: { sizeBytes: true }, _count: true }),
    prisma.attachment.count({ where: { ticket: { status: "CLOSED" } } }),
  ]);

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Spazio archiviazione</h2>
        <p className="mt-0.5 text-sm text-gray-500">Allegati caricati sui ticket.</p>
      </div>

      <div className="flex gap-8">
        <div>
          <p className="text-2xl font-semibold text-gray-900">{formatBytes(stats._sum.sizeBytes ?? 0)}</p>
          <p className="text-xs text-gray-500">Spazio totale occupato</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{stats._count}</p>
          <p className="text-xs text-gray-500">File allegati</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{closedWithAttachments}</p>
          <p className="text-xs text-gray-500">Su ticket chiusi</p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-sm text-gray-600">
          Elimina gli allegati dei ticket chiusi da più di N giorni (il testo del ticket e i commenti restano, si cancella solo il file).
        </p>
        <CleanupForm />
      </div>
    </div>
  );
}
