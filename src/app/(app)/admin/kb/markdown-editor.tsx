"use client";

import { useState, useEffect } from "react";
import { renderKbMarkdown } from "@/lib/kb-markdown";

export function MarkdownEditor({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (tab === "preview") {
      setPreview(renderKbMarkdown(value));
    }
  }, [tab, value]);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      {/* Always-submitted hidden field */}
      <input type="hidden" name={name} value={value} />

      {/* Tab bar */}
      <div className="flex items-center border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_60%,var(--background))]">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-[var(--brand)] text-[var(--brand)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t === "write" ? "Scrivi" : "Anteprima"}
          </button>
        ))}
        <span className="ml-auto pr-4 text-xs text-[var(--muted)]">Markdown</span>
      </div>

      {/* Editor */}
      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={20}
          placeholder="Scrivi il contenuto in Markdown…&#10;&#10;# Titolo&#10;## Sottotitolo&#10;**grassetto**, *corsivo*, `codice`&#10;- voce elenco"
          className="w-full resize-y bg-[var(--surface)] p-4 font-mono text-sm leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
        />
      ) : (
        <div
          className="kb-prose min-h-64 bg-[var(--surface)] p-6"
          dangerouslySetInnerHTML={{ __html: preview || "<p class='text-gray-400 text-sm'>Nessun contenuto da mostrare.</p>" }}
        />
      )}
    </div>
  );
}
