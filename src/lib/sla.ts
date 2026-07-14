import type { TicketPriority, TicketStatus } from "@/generated/prisma/enums";
import type { SettingModel as Setting } from "@/generated/prisma/models/Setting";

export type SlaStatus = "ok" | "warning" | "overdue" | "none";

const ACTIVE_STATUSES = new Set<TicketStatus>(["OPEN", "IN_PROGRESS", "WAITING_ON_USER"]);

export function computeSla(
  ticket: { status: TicketStatus; priority: TicketPriority; createdAt: Date },
  settings: Pick<Setting, "slaUrgentHours" | "slaHighHours" | "slaMediumHours" | "slaLowHours">
): { status: SlaStatus; remainingMs: number | null } {
  if (!ACTIVE_STATUSES.has(ticket.status)) return { status: "none", remainingMs: null };

  const hoursMap: Record<TicketPriority, number | null> = {
    URGENT: settings.slaUrgentHours,
    HIGH:   settings.slaHighHours,
    MEDIUM: settings.slaMediumHours,
    LOW:    settings.slaLowHours,
  };

  const slaHours = hoursMap[ticket.priority];
  if (!slaHours) return { status: "none", remainingMs: null };

  const deadlineMs = ticket.createdAt.getTime() + slaHours * 3_600_000;
  const remainingMs = deadlineMs - Date.now();
  const warningThresholdMs = slaHours * 3_600_000 * 0.2; // last 20% of time

  if (remainingMs <= 0) return { status: "overdue", remainingMs };
  if (remainingMs <= warningThresholdMs) return { status: "warning", remainingMs };
  return { status: "ok", remainingMs };
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) {
    const abs = Math.abs(ms);
    const h = Math.floor(abs / 3_600_000);
    if (h < 24) return `${h}h in ritardo`;
    return `${Math.floor(h / 24)}g in ritardo`;
  }
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h rimanenti`;
  return `${Math.floor(h / 24)}g rimanenti`;
}
