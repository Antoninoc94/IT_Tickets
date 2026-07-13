"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { deleteFile, saveFile } from "@/lib/attachments";

const TemplatesSchema = z.object({
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

  const validated = TemplatesSchema.safeParse(Object.fromEntries(formData));
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

const GraphicsSchema = z.object({
  appName: z.string().trim().min(1, { error: "Inserisci un nome." }).max(40, { error: "Nome troppo lungo (max 40 caratteri)." }),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Colore non valido (usa un formato esadecimale, es. #4f46e5)." }),
});

export type GraphicsState = { error?: string; success?: boolean } | undefined;

export async function updateGraphics(_state: GraphicsState, formData: FormData): Promise<GraphicsState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }

  const validated = GraphicsSchema.safeParse({
    appName: formData.get("appName"),
    brandColor: formData.get("brandColor"),
  });
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

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type LogoState = { error?: string; success?: boolean } | undefined;

export async function uploadLogo(_state: LogoState, formData: FormData): Promise<LogoState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Seleziona un file." };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { error: "Il logo supera il limite di 2 MB." };
  }
  if (!LOGO_TYPES.has(file.type)) {
    return { error: "Formato non valido. Usa PNG, JPG o WebP." };
  }

  const settings = await getSettings();
  const saved = await saveFile(file);
  if (settings.logoStorageKey) {
    await deleteFile(settings.logoStorageKey);
  }

  await prisma.setting.update({ where: { id: "app" }, data: { logoStorageKey: saved.storageKey } });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function removeLogo() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    throw new Error("Non autorizzato.");
  }

  const settings = await getSettings();
  if (settings.logoStorageKey) {
    await deleteFile(settings.logoStorageKey);
  }

  await prisma.setting.update({ where: { id: "app" }, data: { logoStorageKey: null } });
  revalidatePath("/", "layout");
}
