"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBytes } from "@/lib/format-bytes";

type AttachmentItem = { id: string; filename: string; sizeBytes: number; mimeType: string };

function isImage(mime: string) { return mime.startsWith("image/"); }
function isPdf(mime: string) { return mime === "application/pdf"; }
function isText(mime: string) { return mime === "text/plain"; }

function fileIcon(mime: string) {
  if (isImage(mime)) return (
    <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-.48-.480a.75.75 0 00-1.06 0L2.5 11.06zm5-3.56a.75.75 0 100 1.5.75.75 0 000-1.5z" clipRule="evenodd" />
    </svg>
  );
  if (isPdf(mime)) return (
    <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  );
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

function AttachmentModal({ attachment, onClose }: { attachment: AttachmentItem; onClose: () => void }) {
  const inlineUrl = `/api/attachments/${attachment.id}?inline=1`;
  const downloadUrl = `/api/attachments/${attachment.id}`;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[min(92vw,80rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {fileIcon(attachment.mimeType)}
            <span className="truncate text-sm font-medium text-gray-800">{attachment.filename}</span>
            <span className="shrink-0 text-xs text-gray-400">{formatBytes(attachment.sizeBytes)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={downloadUrl}
              download
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              <DownloadIcon />
              Scarica
            </a>
            <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-gray-50 p-4">
          {isImage(attachment.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inlineUrl}
              alt={attachment.filename}
              className="max-h-[80vh] max-w-full rounded object-contain shadow"
            />
          ) : isPdf(attachment.mimeType) || isText(attachment.mimeType) ? (
            <iframe
              src={inlineUrl}
              title={attachment.filename}
              className="h-[80vh] w-full rounded border border-gray-200 bg-white"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="rounded-full bg-gray-100 p-6">
                <svg className="h-10 w-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Anteprima non disponibile</p>
                <p className="mt-1 text-xs text-gray-400">Questo tipo di file non può essere visualizzato nel browser.</p>
              </div>
              <a
                href={downloadUrl}
                download
                className="flex items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <DownloadIcon />
                Scarica il file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AttachmentList({ attachments }: { attachments: AttachmentItem[] }) {
  const [selected, setSelected] = useState<AttachmentItem | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {attachments.map((a) => (
          <div key={a.id} className="flex items-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-700">
            <button
              type="button"
              onClick={() => setSelected(a)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100"
              title="Anteprima"
            >
              {fileIcon(a.mimeType)}
              <span className="max-w-[11rem] truncate font-medium">{a.filename}</span>
              <span className="text-gray-400">{formatBytes(a.sizeBytes)}</span>
            </button>
            <a
              href={`/api/attachments/${a.id}`}
              download
              title="Scarica"
              className="border-l border-gray-200 px-2 py-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <DownloadIcon />
            </a>
          </div>
        ))}
      </div>

      {selected && <AttachmentModal attachment={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
