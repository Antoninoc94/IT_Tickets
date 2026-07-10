"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

const SettingsSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Colore non valido (usa un formato esadecimale, es. #4f46e5)." }),
  newTicketEmailSubject: z.string().trim().min(1),
  newTicketEmailBody: z.string().trim().min(1),
  assignedEmailSubject: z.string().trim().min(1),
  assignedEmailBody: z.string().trim().min(1),
  statusChangedEmailSubject: z.string().trim().min(1),
  statusChangedEmailBody: z.string().trim().min(1),
  newCommentEmailSubject: z.string().trim().min(1),
  newCommentEmailBody: z.string().trim().min(1),
});

export type SettingsState = { error?: string; success?: boolean } | undefined;

export async function updateSettings(_state: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }

  const validated = SettingsSchema.safeParse(Object.fromEntries(formData));
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  await prisma.setting.upsert({
    where: { id: "app" },
    update: validated.data,
    create: { id: "app", ...validated.data },
  });

  revalidatePath("/", "layout");
  return { success: true };
}
