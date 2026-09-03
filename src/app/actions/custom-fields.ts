"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

export type CustomFieldState = { error?: string; success?: boolean } | undefined;

async function assertStaff() {
  const user = await getCurrentUser();
  if (user.role === "USER") throw new Error("Non autorizzato.");
}

const FieldSchema = z.object({
  name:     z.string().trim().min(1, { error: "Il nome è obbligatorio." }).max(80),
  type:     z.enum(["text", "textarea", "number", "select"]),
  required: z.boolean(),
  hint:     z.string().trim().max(200).optional(),
  options:  z.string().optional(),
});

export async function createCustomField(
  categoryId: string,
  _state: CustomFieldState,
  formData: FormData,
): Promise<CustomFieldState> {
  await assertStaff();

  const validated = FieldSchema.safeParse({
    name:     formData.get("name"),
    type:     formData.get("type"),
    required: formData.get("required") === "on",
    hint:     formData.get("hint") || undefined,
    options:  formData.get("options") || undefined,
  });
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Dati non validi." };

  const { name, type, required, hint, options } = validated.data;

  let optionsJson: string | null = null;
  if (type === "select") {
    const opts = (options ?? "").split("\n").map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return { error: "Aggiungi almeno 2 opzioni per il campo selezione." };
    optionsJson = JSON.stringify(opts);
  }

  const maxPos = await prisma.customField.aggregate({ where: { categoryId }, _max: { position: true } });
  const position = (maxPos._max.position ?? -1) + 1;

  await prisma.customField.create({
    data: { name, type, required, hint: hint ?? null, options: optionsJson, position, categoryId },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/tickets/new");
  return { success: true };
}

export async function deleteCustomField(id: string): Promise<CustomFieldState> {
  await assertStaff();
  await prisma.customField.delete({ where: { id } });
  revalidatePath("/admin/categories");
  revalidatePath("/tickets/new");
  return {};
}
