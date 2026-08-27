"use client";

import { useRef, useState } from "react";
import { formatBytes } from "@/lib/format-bytes";

const MAX_FILE_MB = 25;
const MAX_FILES = 5;

function checkFiles(files: File[]): string | null {
  if (files.length > MAX_FILES) return `Puoi allegare al massimo ${MAX_FILES} file per volta.`;
  for (const file of files) {
    if (file.size > MAX_FILE_MB * 1024 * 1024)
      return `"${file.name}" supera il limite di ${MAX_FILE_MB} MB.`;
  }
  return null;
}

function CloseIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

/**
 * File input for attachments that lets the user remove a single file from
 * the pending selection before submitting — a plain `<input type="file">`
 * only supports clearing the whole selection at once. We keep the real
 * input in sync via the DataTransfer API since FileList itself is read-only.
 */
export function AttachmentInput({
  id,
  name = "files",
  onErrorChange,
}: {
  id?: string;
  name?: string;
  onErrorChange?: (error: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function applyFiles(next: File[]) {
    setFiles(next);
    const err = checkFiles(next);
    setError(err);
    onErrorChange?.(err);
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
  }

  function removeFile(index: number) {
    applyFiles(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700"
        onChange={(e) => applyFiles(Array.from(e.target.files ?? []))}
      />

      {files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center gap-1.5 overflow-hidden rounded-md border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-1 text-xs text-gray-700"
            >
              <span className="max-w-[11rem] truncate font-medium">{f.name}</span>
              <span className="text-gray-400">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                title="Rimuovi allegato"
                className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
