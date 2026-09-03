"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const existing = await prisma.kbArticle.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    n++;
    slug = `${base}-${n}`;
  }
}

const ArticleSchema = z.object({
  title:      z.string().trim().min(3, { error: "Titolo troppo corto (min 3 caratteri)." }),
  body:       z.string().trim().min(10, { error: "Contenuto troppo breve." }),
  categoryId: z.string().optional(),
  published:  z.boolean().optional(),
});

export type KbState = { error?: string } | undefined;

export async function createArticle(_state: KbState, formData: FormData): Promise<KbState> {
  const user = await getCurrentUser();
  if (user.role === "USER") return { error: "Non autorizzato." };

  const raw = {
    title:      formData.get("title"),
    body:       formData.get("body"),
    categoryId: formData.get("categoryId") || undefined,
    published:  formData.get("published") === "true",
  };

  const validated = ArticleSchema.safeParse(raw);
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Dati non validi." };

  const slug = await uniqueSlug(toSlug(validated.data.title));

  await prisma.kbArticle.create({
    data: {
      title:      validated.data.title,
      slug,
      body:       validated.data.body,
      categoryId: validated.data.categoryId || null,
      published:  validated.data.published ?? false,
      authorId:   user.id,
    },
  });

  revalidatePath("/admin/kb");
  revalidatePath("/kb");
  redirect("/admin/kb");
}

export async function updateArticle(id: string, _state: KbState, formData: FormData): Promise<KbState> {
  const user = await getCurrentUser();
  if (user.role === "USER") return { error: "Non autorizzato." };

  const raw = {
    title:      formData.get("title"),
    body:       formData.get("body"),
    categoryId: formData.get("categoryId") || undefined,
    published:  formData.get("published") === "true",
  };

  const validated = ArticleSchema.safeParse(raw);
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Dati non validi." };

  const slug = await uniqueSlug(toSlug(validated.data.title), id);

  await prisma.kbArticle.update({
    where: { id },
    data: {
      title:      validated.data.title,
      slug,
      body:       validated.data.body,
      categoryId: validated.data.categoryId || null,
      published:  validated.data.published ?? false,
    },
  });

  revalidatePath("/admin/kb");
  revalidatePath("/kb");
  revalidatePath(`/kb/${slug}`);
  redirect("/admin/kb");
}

export async function deleteArticle(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (user.role === "USER") return;
  await prisma.kbArticle.delete({ where: { id } });
  revalidatePath("/admin/kb");
  revalidatePath("/kb");
}
