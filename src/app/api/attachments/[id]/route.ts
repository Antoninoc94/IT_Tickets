import { NextResponse } from "next/server";
import fs from "fs/promises";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { attachmentFilePath } from "@/lib/attachments";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: {
      ticket: { select: { requesterId: true } },
      comment: { select: { internal: true } },
    },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Allegato non trovato." }, { status: 404 });
  }

  const isStaff = session.role !== "USER";
  const isOwner = attachment.ticket.requesterId === session.userId;
  if (!isStaff && (!isOwner || attachment.comment?.internal)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(attachmentFilePath(attachment.storageKey));
  } catch {
    return NextResponse.json({ error: "File non trovato sul server." }, { status: 404 });
  }

  const disposition = inline ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(attachment.filename)}"`,
      "Content-Length": String(attachment.sizeBytes),
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
