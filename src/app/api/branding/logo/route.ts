import { NextResponse } from "next/server";
import fs from "fs/promises";
import { getSettings } from "@/lib/settings";
import { attachmentFilePath } from "@/lib/attachments";

function contentTypeFor(storageKey: string) {
  const ext = storageKey.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

// Public: the logo is shown on the unauthenticated login/register pages.
export async function GET() {
  const settings = await getSettings();
  if (!settings.logoStorageKey) {
    return new NextResponse(null, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(attachmentFilePath(settings.logoStorageKey));
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeFor(settings.logoStorageKey),
      // The src always carries ?v=<storageKey>, which changes on every
      // upload, so the file itself can be cached aggressively.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
