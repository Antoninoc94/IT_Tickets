import { formatBytes } from "@/lib/attachments";

type AttachmentItem = { id: string; filename: string; sizeBytes: number };

export function AttachmentList({ attachments }: { attachments: AttachmentItem[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((a) => (
        <a
          key={a.id}
          href={`/api/attachments/${a.id}`}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 hover:border-gray-300 hover:bg-gray-100"
        >
          <span className="max-w-[12rem] truncate font-medium">{a.filename}</span>
          <span className="text-gray-400">{formatBytes(a.sizeBytes)}</span>
        </a>
      ))}
    </div>
  );
}
