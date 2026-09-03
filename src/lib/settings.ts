import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getSettings = cache(async () => {
  const existing = await prisma.setting.findUnique({ where: { id: "app" } });
  if (existing) return existing;

  try {
    return await prisma.setting.create({ data: { id: "app" } });
  } catch {
    // Another concurrent request created it first.
    return prisma.setting.findUniqueOrThrow({ where: { id: "app" } });
  }
});

export function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}
