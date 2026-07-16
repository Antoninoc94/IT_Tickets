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

export async function uploadEmailLogo(_state: LogoState, formData: FormData): Promise<LogoState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") return { error: "Non autorizzato." };

  const file = formData.get("emailLogo");
  if (!(file instanceof File) || file.size === 0) return { error: "Seleziona un file." };
  if (file.size > LOGO_MAX_BYTES) return { error: "Il logo supera il limite di 2 MB." };
  if (!LOGO_TYPES.has(file.type)) return { error: "Formato non valido. Usa PNG, JPG o WebP." };

  const settings = await getSettings();
  const saved = await saveFile(file);
  if (settings.emailLogoStorageKey) await deleteFile(settings.emailLogoStorageKey);

  await prisma.setting.update({ where: { id: "app" }, data: { emailLogoStorageKey: saved.storageKey } });
  return { success: true };
}

export async function removeEmailLogo() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") throw new Error("Non autorizzato.");

  const settings = await getSettings();
  if (settings.emailLogoStorageKey) await deleteFile(settings.emailLogoStorageKey);

  await prisma.setting.update({ where: { id: "app" }, data: { emailLogoStorageKey: null } });
}

const FAVICON_MAX_BYTES = 512 * 1024;
const FAVICON_TYPES = new Set(["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml"]);

export type FaviconState = { error?: string; success?: boolean } | undefined;

export async function uploadFavicon(_state: FaviconState, formData: FormData): Promise<FaviconState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Non autorizzato." };
  }

  const file = formData.get("favicon");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Seleziona un file." };
  }
  if (file.size > FAVICON_MAX_BYTES) {
    return { error: "La favicon supera il limite di 512 KB." };
  }
  // Browsers often report ICO as "application/octet-stream"; accept by extension too.
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!FAVICON_TYPES.has(file.type) && ext !== "ico" && ext !== "png" && ext !== "svg") {
    return { error: "Formato non valido. Usa ICO, PNG o SVG." };
  }

  const settings = await getSettings();
  const saved = await saveFile(file);
  if (settings.faviconStorageKey) {
    await deleteFile(settings.faviconStorageKey);
  }

  await prisma.setting.update({ where: { id: "app" }, data: { faviconStorageKey: saved.storageKey } });
  revalidatePath("/", "layout");
  return { success: true };
}

// ---------------------------------------------------------------------------
// SLA
// ---------------------------------------------------------------------------

const SlaSchema = z.object({
  slaUrgentHours:  z.preprocess((v) => (v === "" ? null : Number(v)), z.number().int().min(1).max(8760).nullable()),
  slaHighHours:    z.preprocess((v) => (v === "" ? null : Number(v)), z.number().int().min(1).max(8760).nullable()),
  slaMediumHours:  z.preprocess((v) => (v === "" ? null : Number(v)), z.number().int().min(1).max(8760).nullable()),
  slaLowHours:     z.preprocess((v) => (v === "" ? null : Number(v)), z.number().int().min(1).max(8760).nullable()),
});

export type SlaState = { error?: string; success?: boolean } | undefined;

export async function updateSla(_state: SlaState, formData: FormData): Promise<SlaState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") return { error: "Non autorizzato." };

  const validated = SlaSchema.safeParse({
    slaUrgentHours: formData.get("slaUrgentHours"),
    slaHighHours:   formData.get("slaHighHours"),
    slaMediumHours: formData.get("slaMediumHours"),
    slaLowHours:    formData.get("slaLowHours"),
  });
  if (!validated.success) return { error: "Valori non validi. Inserisci ore intere tra 1 e 8760." };

  await prisma.setting.upsert({
    where: { id: "app" },
    update: validated.data,
    create: { id: "app", ...validated.data },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Email toggle + reminder + digest
// ---------------------------------------------------------------------------

export type EmailFlagsState = { error?: string; success?: boolean } | undefined;

export async function updateEmailFlags(_state: EmailFlagsState, formData: FormData): Promise<EmailFlagsState> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") return { error: "Non autorizzato." };

  const emailEnabled = formData.get("emailEnabled") === "on";
  const digestEnabled = formData.get("digestEnabled") === "on";
  const rawDays = formData.get("reminderDays");
  const reminderDays = rawDays === "" || rawDays === null ? null : parseInt(rawDays as string);
  if (reminderDays !== null && (isNaN(reminderDays) || reminderDays < 1 || reminderDays > 365)) {
    return { error: "Giorni promemoria: inserisci un valore tra 1 e 365, oppure lascia vuoto per disabilitare." };
  }
  const rawAutoClose = formData.get("autoCloseDays");
  const autoCloseDays = rawAutoClose === "" || rawAutoClose === null ? null : parseInt(rawAutoClose as string);
  if (autoCloseDays !== null && (isNaN(autoCloseDays) || autoCloseDays < 1 || autoCloseDays > 365)) {
    return { error: "Giorni chiusura automatica: inserisci un valore tra 1 e 365, oppure lascia vuoto per disabilitare." };
  }

  await prisma.setting.upsert({
    where: { id: "app" },
    update: { emailEnabled, digestEnabled, reminderDays, autoCloseDays },
    create: { id: "app", emailEnabled, digestEnabled, reminderDays, autoCloseDays },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function removeFavicon() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    throw new Error("Non autorizzato.");
  }

  const settings = await getSettings();
  if (settings.faviconStorageKey) {
    await deleteFile(settings.faviconStorageKey);
  }

  await prisma.setting.update({ where: { id: "app" }, data: { faviconStorageKey: null } });
  revalidatePath("/", "layout");
}
