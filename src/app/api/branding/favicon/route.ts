import { NextResponse } from "next/server";
import fs from "fs/promises";
import { getSettings } from "@/lib/settings";
import { attachmentFilePath } from "@/lib/attachments";

function contentTypeFor(storageKey: string) {
  const ext = storageKey.split(".").pop()?.toLowerCase();
  if (ext === "ico") return "image/x-icon";
  if (ext === "png") return "image/png";
  if (ext === "svg") return "image/svg+xml";
  return "image/x-icon";
}

// Public: served in the browser <head> as the favicon.
export async function GET() {
  const settings = await getSettings();
  if (!settings.faviconStorageKey) {
    return new NextResponse(null, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(attachmentFilePath(settings.faviconStorageKey));
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeFor(settings.faviconStorageKey),
      // ?v=<storageKey> changes on every upload, so cache aggressively.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
