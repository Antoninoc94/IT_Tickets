"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

const TagSchema = z.object({
  name: z.string().trim().min(1, { error: "Il nome non può essere vuoto." }).max(30, { error: "Nome troppo lungo (max 30 caratteri)." }),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Colore non valido." }),
});

export type TagState = { error?: string } | undefined;

export async function createTag(_state: TagState, formData: FormData): Promise<TagState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") throw new Error("Non autorizzato.");

  const validated = TagSchema.safeParse({ name: formData.get("name"), color: formData.get("color") });
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Dati non validi." };

  try {
    await prisma.tag.create({ data: validated.data });
  } catch {
    return { error: "Esiste già un tag con questo nome." };
  }
  revalidatePath("/admin/tags");
}

export async function deleteTag(id: string) {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") throw new Error("Non autorizzato.");
  await prisma.tag.delete({ where: { id } });
  revalidatePath("/admin/tags");
}

export async function setTicketTags(ticketId: string, tagIds: string[]) {
  const user = await getCurrentUser();
  if (user.role === "USER") throw new Error("Non autorizzato.");
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { tags: { set: tagIds.map((id) => ({ id })) } },
  });
  revalidatePath(`/tickets/${ticketId}`);
}
