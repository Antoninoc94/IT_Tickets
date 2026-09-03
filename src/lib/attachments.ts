import "server-only";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
export { formatBytes } from "./format-bytes";

export const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 25) * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 5;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
]);

function uploadsDir() {
  // process.cwd() is only a dev-time fallback; production always sets
  // UPLOADS_DIR explicitly (see docker-compose.yml). The ignore comment
  // stops Next's file tracer from bundling the whole project because of
  // this dynamic path.
  return process.env.UPLOADS_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");
}

export function validateFile(file: File): string | null {
  if (file.size === 0) return null; // empty file input, ignore
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `"${file.name}" supera il limite di ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB.`;
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `"${file.name}" ha un formato non consentito.`;
  }
  return null;
}

export async function saveFile(file: File) {
  const dir = uploadsDir();
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(file.name).slice(0, 10);
  const storageKey = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, storageKey), buffer);

  return {
    storageKey,
    filename: file.name.slice(0, 255),
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function saveUploadedFiles(files: File[]) {
  const real = files.filter((f) => f.size > 0);
  if (real.length > MAX_FILES_PER_UPLOAD) {
    return { error: `Puoi allegare al massimo ${MAX_FILES_PER_UPLOAD} file per volta.`, saved: [] };
  }

  for (const file of real) {
    const error = validateFile(file);
    if (error) return { error, saved: [] };
  }

  const saved = await Promise.all(real.map(saveFile));
  return { error: null, saved };
}

export async function deleteFile(storageKey: string) {
  try {
    await fs.unlink(path.join(uploadsDir(), storageKey));
  } catch {
    // Already gone, nothing to do.
  }
}

export function attachmentFilePath(storageKey: string) {
  return path.join(uploadsDir(), storageKey);
}

