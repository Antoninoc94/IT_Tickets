import type { ReactNode } from "react";

export function renderWithMentions(text: string, knownNames: string[]): ReactNode {
  // Sort longest names first so "Mario Rossi" matches before "Mario"
  const sorted = [...knownNames].sort((a, b) => b.length - a.length);

  type Segment = string | ReactNode;

  let segments: Segment[] = [text];

  sorted.forEach((name) => {
    const mention = `@${name}`;
    const next: Segment[] = [];

    segments.forEach((seg, i) => {
      if (typeof seg !== "string") {
        next.push(seg);
        return;
      }
      const parts = seg.split(mention);
      parts.forEach((part, j) => {
        if (part !== "") next.push(part);
        if (j < parts.length - 1) {
          next.push(
            <span
              key={`${i}-${j}-${name}`}
              className="inline-flex items-center rounded px-1 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: "color-mix(in srgb, var(--brand) 12%, transparent)", color: "var(--brand)" }}
            >
              @{name}
            </span>
          );
        }
      });
    });

    segments = next;
  });

  return <>{segments}</>;
}
