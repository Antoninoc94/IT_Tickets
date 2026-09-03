import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// KB articles are staff-authored (IT/Admin) but rendered on a public,
// unauthenticated page — sanitize even though the author is "trusted",
// since marked passes raw HTML in the markdown source straight through.
export function renderKbMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title"],
      a: ["href", "name", "target", "rel"],
    },
  });
}
