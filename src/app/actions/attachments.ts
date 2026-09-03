"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { deleteFile, formatBytes } from "@/lib/attachments";

const CleanupSchema = z.object({
  days: z.coerce.number().int().min(1, { error: "Inserisci un numero di giorni valido." }),
});

export type CleanupState = { error?: string; message?: string } | undefined;

export async function cleanupOldAttachments(_state: CleanupState, formData: FormData): Promise<CleanupState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }

  const validated = CleanupSchema.safeParse({ days: formData.get("days") });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  const cutoff = new Date(Date.now() - validated.data.days * 24 * 60 * 60 * 1000);

  const toDelete = await prisma.attachment.findMany({
    where: { ticket: { status: "CLOSED", closedAt: { lte: cutoff } } },
    select: { id: true, storageKey: true, sizeBytes: true },
  });

  if (toDelete.length === 0) {
    return { message: "Nessun allegato da eliminare." };
  }

  await Promise.all(toDelete.map((a) => deleteFile(a.storageKey)));
  await prisma.attachment.deleteMany({ where: { id: { in: toDelete.map((a) => a.id) } } });

  const bytesFreed = toDelete.reduce((sum, a) => sum + a.sizeBytes, 0);

  revalidatePath("/admin/settings");
  return { message: `Eliminati ${toDelete.length} allegati, liberati ${formatBytes(bytesFreed)}.` };
}

export type WipeState = { error?: string; message?: string } | undefined;

export async function wipeAllTickets(_state: WipeState, formData: FormData): Promise<WipeState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") return { error: "Non autorizzato." };

  const confirm = formData.get("confirm");
  if (confirm !== "ELIMINA") return { error: "Parola di conferma errata." };

  // Fetch all attachment storage keys before deleting
  const attachments = await prisma.attachment.findMany({ select: { storageKey: true } });

  // Delete files from disk (ignore individual errors — file may already be gone)
  await Promise.allSettled(attachments.map((a) => deleteFile(a.storageKey)));

  // Delete all tickets; cascade removes comments, events, fieldValues, attachment records
  await prisma.ticket.deleteMany({});

  revalidatePath("/dashboard");
  revalidatePath("/admin/settings");
  return { message: `Eliminati ${attachments.length} allegati e tutti i ticket.` };
}
