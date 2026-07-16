import type { TicketPriority, TicketStatus } from "@/generated/prisma/enums";
import type { SettingModel as Setting } from "@/generated/prisma/models/Setting";

export type SlaStatus = "ok" | "warning" | "overdue" | "none";

const ACTIVE_STATUSES = new Set<TicketStatus>(["OPEN", "IN_PROGRESS", "WAITING_ON_USER"]);

function isWorkDay(dayMs: number, workDays: number[]): boolean {
  const d = new Date(dayMs);
  const utcDay = d.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const isoDay = utcDay === 0 ? 7 : utcDay; // ISO: 1=Mon … 7=Sun
  return workDays.includes(isoDay);
}

function businessHoursElapsedMs(
  from: Date,
  to: Date,
  workdayStart: number,
  workdayEnd: number,
  workDays: number[]
): number {
  if (to <= from) return 0;
  let elapsed = 0;

  // Start at midnight UTC of the day containing `from`
  let dayMs = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());

  while (dayMs < to.getTime()) {
    if (isWorkDay(dayMs, workDays)) {
      const dayStartMs = dayMs + workdayStart * 3_600_000;
      const dayEndMs   = dayMs + workdayEnd   * 3_600_000;
      const sliceStart = Math.max(from.getTime(), dayStartMs);
      const sliceEnd   = Math.min(to.getTime(),   dayEndMs);
      if (sliceEnd > sliceStart) elapsed += sliceEnd - sliceStart;
    }
    dayMs += 86_400_000;
  }

  return elapsed;
}

export function computeSla(
  ticket: { status: TicketStatus; priority: TicketPriority; createdAt: Date },
  settings: Pick<
    Setting,
    | "slaUrgentHours" | "slaHighHours" | "slaMediumHours" | "slaLowHours"
    | "slaBusinessHours" | "slaWorkdayStart" | "slaWorkdayEnd" | "slaWorkDays"
  >
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

  const totalSlaMs         = slaHours * 3_600_000;
  const warningThresholdMs = totalSlaMs * 0.2;

  if (settings.slaBusinessHours && settings.slaWorkDays) {
    const workDays      = settings.slaWorkDays.split(",").map(Number);
    const workdayStart  = settings.slaWorkdayStart;
    const workdayEnd    = settings.slaWorkdayEnd;
    const elapsedBizMs  = businessHoursElapsedMs(ticket.createdAt, new Date(), workdayStart, workdayEnd, workDays);
    const remainingBizMs = totalSlaMs - elapsedBizMs;
    if (remainingBizMs <= 0)              return { status: "overdue", remainingMs: remainingBizMs };
    if (remainingBizMs <= warningThresholdMs) return { status: "warning", remainingMs: remainingBizMs };
    return { status: "ok", remainingMs: remainingBizMs };
  }

  const deadlineMs  = ticket.createdAt.getTime() + totalSlaMs;
  const remainingMs = deadlineMs - Date.now();
  if (remainingMs <= 0)              return { status: "overdue", remainingMs };
  if (remainingMs <= warningThresholdMs) return { status: "warning", remainingMs };
  return { status: "ok", remainingMs };
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) {
    const abs = Math.abs(ms);
    const h   = Math.floor(abs / 3_600_000);
    if (h < 24) return `${h}h in ritardo`;
    return `${Math.floor(h / 24)}g in ritardo`;
  }
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h rimanenti`;
  return `${Math.floor(h / 24)}g rimanenti`;
}
