"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import type { TicketPriority } from "@/generated/prisma/enums";

const TemplateSchema = z.object({
  name: z.string().trim().min(1, { error: "Il nome è obbligatorio." }),
  title: z.string().trim(),
  description: z.string().trim(),
  categoryId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export type TemplateState = { error?: string; success?: boolean } | undefined;

export async function createTemplate(
  _state: TemplateState,
  formData: FormData
): Promise<TemplateState> {
  const user = await getCurrentUser();
  if (user.role === "USER") return { error: "Non autorizzato." };

  const validated = TemplateSchema.safeParse({
    name: formData.get("name"),
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId") || undefined,
    priority: formData.get("priority") || undefined,
  });
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Dati non validi." };

  await prisma.ticketTemplate.create({
    data: {
      name: validated.data.name,
      title: validated.data.title,
      description: validated.data.description,
      categoryId: validated.data.categoryId || null,
      priority: validated.data.priority as TicketPriority | undefined,
    },
  });

  revalidatePath("/admin/templates");
  return { success: true };
}

export async function deleteTemplate(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (user.role === "USER") throw new Error("Non autorizzato.");
  await prisma.ticketTemplate.delete({ where: { id } });
  revalidatePath("/admin/templates");
}
