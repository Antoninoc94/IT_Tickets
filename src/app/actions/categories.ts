"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

const CategorySchema = z.object({
  name:  z.string().trim().min(1, { error: "Il nome è obbligatorio." }).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Colore non valido (usa formato #rrggbb)." }),
});

export type CategoryState = { error?: string; success?: boolean } | undefined;

async function assertStaff() {
  const user = await getCurrentUser();
  if (user.role === "USER") throw new Error("Non autorizzato.");
}

export async function createCategory(_state: CategoryState, formData: FormData): Promise<CategoryState> {
  await assertStaff();

  const validated = CategorySchema.safeParse({
    name:  formData.get("name"),
    color: formData.get("color"),
  });
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Dati non validi." };

  const maxPos = await prisma.category.aggregate({ _max: { position: true } });
  const position = (maxPos._max.position ?? -1) + 1;

  await prisma.category.create({ data: { ...validated.data, position } });
  revalidatePath("/admin/categories");
  revalidatePath("/tickets/new");
  return { success: true };
}

export async function updateCategory(id: string, _state: CategoryState, formData: FormData): Promise<CategoryState> {
  await assertStaff();

  const validated = CategorySchema.safeParse({
    name:  formData.get("name"),
    color: formData.get("color"),
  });
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Dati non validi." };

  await prisma.category.update({ where: { id }, data: validated.data });
  revalidatePath("/admin/categories");
  revalidatePath("/tickets/new");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleCategory(id: string, enabled: boolean): Promise<void> {
  await assertStaff();
  await prisma.category.update({ where: { id }, data: { enabled } });
  revalidatePath("/admin/categories");
}

export async function deleteCategory(id: string): Promise<CategoryState> {
  await assertStaff();

  const count = await prisma.ticket.count({ where: { categoryId: id } });
  if (count > 0) return { error: `Impossibile eliminare: ${count} ticket ${count === 1 ? "usa" : "usano"} questa categoria.` };

  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  revalidatePath("/tickets/new");
  return { success: true };
}
