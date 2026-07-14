"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

const CannedResponseSchema = z.object({
  title: z.string().trim().min(2, { error: "Il titolo deve avere almeno 2 caratteri." }),
  body: z.string().trim().min(5, { error: "Il testo deve avere almeno 5 caratteri." }),
});

export type CannedResponseState = { error?: string } | undefined;

export async function createCannedResponse(
  _state: CannedResponseState,
  formData: FormData
): Promise<CannedResponseState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") throw new Error("Non autorizzato.");

  const validated = CannedResponseSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dati non validi." };
  }

  await prisma.cannedResponse.create({ data: validated.data });
  revalidatePath("/admin/canned-responses");
}

export async function deleteCannedResponse(id: string) {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") throw new Error("Non autorizzato.");

  await prisma.cannedResponse.delete({ where: { id } });
  revalidatePath("/admin/canned-responses");
}
