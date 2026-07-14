import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import {
  categoryBarClass,
  categoryChartColor,
  categoryLabels,
  priorityBarClass,
  priorityChartColor,
  priorityLabels,
  statusBarClass,
  statusChartColor,
  statusLabels,
} from "@/lib/ticket-labels";
import { DistributionBar } from "./distribution-bar";
import { DonutChart } from "./donut-chart";
import { PrintButton } from "./print-button";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

function countBy<T extends string>(items: T[], keys: readonly T[]) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
  for (const item of items) counts[item]++;
  return counts;
}

function formatDuration(ms: number) {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${hours.toFixed(1)} ore`;
  return `${(hours / 24).toFixed(1)} giorni`;
}

function generatedAtLabel() {
  return new Date().toLocaleString("it-IT", { dateStyle: "long", timeStyle: "short" });
}

function trendCounts(createdDates: Date[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last30 = createdDates.filter((d) => now - d.getTime() <= 30 * day).length;
  const prev30 = createdDates.filter((d) => {
    const age = now - d.getTime();
    return age > 30 * day && age <= 60 * day;
  }).length;
  return { last30, prev30 };
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (user.role === "USER") redirect("/dashboard");

  const settings = await getSettings();

  const tickets = await prisma.ticket.findMany({
    select: {
      status: true,
      priority: true,
      category: true,
      createdAt: true,
      resolvedAt: true,
      closedAt: true,
      requester: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  const total = tickets.length;

  const statusCounts = countBy(
    tickets.map((t) => t.status),
    Object.keys(statusLabels) as TicketStatus[]
  );
  const priorityCounts = countBy(
    tickets.map((t) => t.priority),
    Object.keys(priorityLabels) as TicketPriority[]
  );
  const categoryCounts = countBy(
    tickets.map((t) => t.category),
    Object.keys(categoryLabels) as TicketCategory[]
  );

  const requesterCounts = new Map<string, number>();
  for (const t of tickets) requesterCounts.set(t.requester.name, (requesterCounts.get(t.requester.name) ?? 0) + 1);
  const topRequesters = [...requesterCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const assigneeCounts = new Map<string, number>();
  let unassignedCount = 0;
  for (const t of tickets) {
    if (t.assignee) assigneeCounts.set(t.assignee.name, (assigneeCounts.get(t.assignee.name) ?? 0) + 1);
    else unassignedCount++;
  }
  const topAssignees = [...assigneeCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Avg resolution per technician
  const techResolution = new Map<string, { sum: number; count: number }>();
  for (const t of tickets) {
    if (!t.assignee) continue;
    const end = t.resolvedAt ?? t.closedAt;
    if (!end) continue;
    const ms = end.getTime() - t.createdAt.getTime();
    const name = t.assignee.name;
    const prev = techResolution.get(name) ?? { sum: 0, count: 0 };
    techResolution.set(name, { sum: prev.sum + ms, count: prev.count + 1 });
  }
  const techResolutionRows = [...techResolution.entries()]
    .map(([name, { sum, count }]) => ({ name, avg: sum / count, count }))
    .sort((a, b) => a.avg - b.avg);

  // Time to resolution, falling back to the closure time for tickets that were
  // closed directly without first being marked "Risolto".
  const resolutionDurations = tickets
    .map((t) => {
      const end = t.resolvedAt ?? t.closedAt;
      return end ? end.getTime() - t.createdAt.getTime() : null;
    })
    .filter((ms): ms is number => ms !== null);
  const avgResolutionMs =
    resolutionDurations.length > 0
      ? resolutionDurations.reduce((sum, ms) => sum + ms, 0) / resolutionDurations.length
      : null;

  const { last30, prev30 } = trendCounts(tickets.map((t) => t.createdAt));
  const trendDelta = last30 - prev30;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="print-only mb-2">
        <p className="text-lg font-semibold text-gray-900">{settings.appName} — Report</p>
        <p className="text-sm text-gray-500">Generato il {generatedAtLabel()}</p>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Report</h1>
          <p className="page-subtitle">Andamento generale dei ticket.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">Ticket totali</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">{statusCounts.OPEN + statusCounts.IN_PROGRESS + statusCounts.WAITING_ON_USER}</p>
          <p className="text-xs text-gray-500">Ancora aperti</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">{avgResolutionMs ? formatDuration(avgResolutionMs) : "—"}</p>
          <p className="text-xs text-gray-500">Tempo medio di risoluzione</p>
          <p className="mt-1 text-[10px] text-gray-400">Dalla creazione alla data di Risolto o Chiuso</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">
            {last30}
            {trendDelta !== 0 && (
              <span className={`ml-1 text-sm font-normal ${trendDelta > 0 ? "text-red-600" : "text-green-600"}`}>
                {trendDelta > 0 ? "▲" : "▼"} {Math.abs(trendDelta)}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">Nuovi ticket (ultimi 30gg)</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-gray-900">Per stato</h2>
          <DonutChart data={[
            { label: statusLabels.OPEN, value: statusCounts.OPEN, color: statusChartColor.OPEN },
            { label: statusLabels.IN_PROGRESS, value: statusCounts.IN_PROGRESS, color: statusChartColor.IN_PROGRESS },
            { label: statusLabels.WAITING_ON_USER, value: statusCounts.WAITING_ON_USER, color: statusChartColor.WAITING_ON_USER },
            { label: statusLabels.RESOLVED, value: statusCounts.RESOLVED, color: statusChartColor.RESOLVED },
            { label: statusLabels.CLOSED, value: statusCounts.CLOSED, color: statusChartColor.CLOSED },
          ]} />
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-gray-900">Per priorità</h2>
          <DonutChart data={[
            { label: priorityLabels.URGENT, value: priorityCounts.URGENT, color: priorityChartColor.URGENT },
            { label: priorityLabels.HIGH, value: priorityCounts.HIGH, color: priorityChartColor.HIGH },
            { label: priorityLabels.MEDIUM, value: priorityCounts.MEDIUM, color: priorityChartColor.MEDIUM },
            { label: priorityLabels.LOW, value: priorityCounts.LOW, color: priorityChartColor.LOW },
          ]} />
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-gray-900">Per categoria</h2>
          <DonutChart data={[
            { label: categoryLabels.HARDWARE, value: categoryCounts.HARDWARE, color: categoryChartColor.HARDWARE },
            { label: categoryLabels.SOFTWARE, value: categoryCounts.SOFTWARE, color: categoryChartColor.SOFTWARE },
            { label: categoryLabels.NETWORK, value: categoryCounts.NETWORK, color: categoryChartColor.NETWORK },
            { label: categoryLabels.ACCOUNT, value: categoryCounts.ACCOUNT, color: categoryChartColor.ACCOUNT },
            { label: categoryLabels.OTHER, value: categoryCounts.OTHER, color: categoryChartColor.OTHER },
          ]} />
        </div>
      </div>

      {techResolutionRows.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Tempo medio di risoluzione per tecnico</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="pb-2 text-left">Tecnico</th>
                <th className="pb-2 text-right">Ticket risolti</th>
                <th className="pb-2 text-right">Tempo medio</th>
              </tr>
            </thead>
            <tbody>
              {techResolutionRows.map((row) => (
                <tr key={row.name} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-700">{row.name}</td>
                  <td className="py-2 text-right text-gray-900">{row.count}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatDuration(row.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Ticket per richiedente</h2>
          {topRequesters.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun dato.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topRequesters.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between">
                  <span className="text-gray-700">{name}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Carico di lavoro IT</h2>
          {topAssignees.length === 0 && unassignedCount === 0 ? (
            <p className="text-sm text-gray-500">Nessun dato.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topAssignees.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between">
                  <span className="text-gray-700">{name}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </li>
              ))}
              {unassignedCount > 0 && (
                <li className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <span className="text-gray-500">Non assegnati</span>
                  <span className="font-medium text-gray-900">{unassignedCount}</span>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
