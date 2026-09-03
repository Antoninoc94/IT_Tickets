import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { pickEnum } from "@/lib/query-params";
import {
  priorityBarClass,
  priorityChartColor,
  priorityLabels,
  statusBarClass,
  statusChartColor,
  statusLabels,
} from "@/lib/ticket-labels";
import { DistributionBar } from "./distribution-bar";
import { DonutChart } from "./donut-chart";
import { TrendChart } from "./trend-chart";
import { PrintButton } from "./print-button";
import { ReportFilterBar } from "./report-filter-bar";
import type { TicketPriority, TicketStatus } from "@/generated/prisma/enums";

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
  return new Date().toLocaleString("it-IT", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Rome" });
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

type SearchParams = {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  priority?: string;
  assigneeId?: string;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (user.role === "USER") redirect("/dashboard");

  const settings = await getSettings();
  const params = await searchParams;

  const categoryId = params.category || undefined;
  const priority  = pickEnum<TicketPriority>(params.priority, Object.keys(priorityLabels) as TicketPriority[]);
  const dateFrom  = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo    = params.dateTo   ? new Date(params.dateTo + "T23:59:59.999Z") : undefined;
  const assigneeId = params.assigneeId || undefined;

  const hasActiveFilters = Boolean(params.dateFrom || params.dateTo || params.category || params.priority || params.assigneeId);

  // Base where clause shared by both queries
  const where = {
    ...(categoryId ? { categoryId } : {}),
    ...(priority   ? { priority }   : {}),
    ...(assigneeId ? { assigneeId } : {}),
    ...((dateFrom || dateTo) ? {
      createdAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo   ? { lte: dateTo }   : {}),
      },
    } : {}),
  };

  const [itUsers, dbCategories] = await Promise.all([
    prisma.user.findMany({ where: { role: "IT", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
  ]);

  const [tickets, ticketsWithFirstResponse] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: {
        status: true,
        priority: true,
        categoryId: true,
        createdAt: true,
        resolvedAt: true,
        closedAt: true,
        requester: { select: { name: true } },
        assignee:  { select: { name: true } },
      },
    }),
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        comments: {
          where: { internal: false, author: { role: "IT" } },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true, author: { select: { name: true } } },
        },
      },
    }),
  ]);

  const total = tickets.length;

  const statusCounts   = countBy(tickets.map((t) => t.status),   Object.keys(statusLabels)   as TicketStatus[]);
  const priorityCounts = countBy(tickets.map((t) => t.priority), Object.keys(priorityLabels) as TicketPriority[]);
  const categoryCountsMap = new Map<string, number>();
  for (const t of tickets) categoryCountsMap.set(t.categoryId, (categoryCountsMap.get(t.categoryId) ?? 0) + 1);

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
    const ms   = end.getTime() - t.createdAt.getTime();
    const name = t.assignee.name;
    const prev = techResolution.get(name) ?? { sum: 0, count: 0 };
    techResolution.set(name, { sum: prev.sum + ms, count: prev.count + 1 });
  }
  const techResolutionRows = [...techResolution.entries()]
    .map(([name, { sum, count }]) => ({ name, avg: sum / count, count }))
    .sort((a, b) => a.avg - b.avg);

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

  // First response time per technician
  const techFirstResponse = new Map<string, { sum: number; count: number }>();
  let totalFirstResponseMs = 0;
  let firstResponseCount = 0;
  for (const t of ticketsWithFirstResponse) {
    const firstComment = t.comments[0];
    if (!firstComment) continue;
    const ms = firstComment.createdAt.getTime() - t.createdAt.getTime();
    if (ms < 0) continue;
    totalFirstResponseMs += ms;
    firstResponseCount++;
    const name = firstComment.author.name;
    const prev = techFirstResponse.get(name) ?? { sum: 0, count: 0 };
    techFirstResponse.set(name, { sum: prev.sum + ms, count: prev.count + 1 });
  }
  const avgFirstResponseMs = firstResponseCount > 0 ? totalFirstResponseMs / firstResponseCount : null;
  const techFirstResponseRows = [...techFirstResponse.entries()]
    .map(([name, { sum, count }]) => ({ name, avg: sum / count, count }))
    .sort((a, b) => a.avg - b.avg);

  const { last30, prev30 } = trendCounts(tickets.map((t) => t.createdAt));
  const trendDelta = last30 - prev30;

  // Daily ticket counts for the line chart
  const trendDays = (() => {
    const dayCounts = new Map<string, number>();
    for (const t of tickets) {
      const key = t.createdAt.toLocaleDateString("it-IT", {
        timeZone: "Europe/Rome",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
    const msPerDay = 24 * 60 * 60 * 1000;
    const end = dateTo ?? new Date();
    const start = dateFrom ?? new Date(end.getTime() - 59 * msPerDay);
    const days: { date: string; count: number }[] = [];
    let cursor = new Date(start);
    cursor.setHours(12, 0, 0, 0);
    const endNoon = new Date(end);
    endNoon.setHours(12, 0, 0, 0);
    while (cursor <= endNoon) {
      const key = cursor.toLocaleDateString("it-IT", {
        timeZone: "Europe/Rome",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      days.push({ date: key, count: dayCounts.get(key) ?? 0 });
      cursor = new Date(cursor.getTime() + msPerDay);
    }
    return days;
  })();

  // Active filter label for print header
  const filterLabel = [
    dateFrom && dateTo  ? `dal ${dateFrom.toLocaleDateString("it-IT")} al ${dateTo.toLocaleDateString("it-IT")}` :
    dateFrom            ? `dal ${dateFrom.toLocaleDateString("it-IT")}` :
    dateTo              ? `fino al ${dateTo.toLocaleDateString("it-IT")}` : "",
    categoryId ? (dbCategories.find((c) => c.id === categoryId)?.name ?? "") : "",
    priority ? priorityLabels[priority] : "",
    assigneeId ? (itUsers.find((u) => u.id === assigneeId)?.name ?? "") : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Print-only header */}
      <div className="print-only mb-2">
        <p className="text-lg font-semibold text-gray-900">{settings.appName} — Report</p>
        <p className="text-sm text-gray-500">
          Generato il {generatedAtLabel()}
          {filterLabel && ` · Filtri: ${filterLabel}`}
        </p>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Report</h1>
          <p className="page-subtitle">
            {hasActiveFilters ? `Statistiche filtrate — ${filterLabel}` : "Andamento generale dei ticket."}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Filter bar */}
      <ReportFilterBar
        values={params}
        assignees={itUsers}
        categories={dbCategories}
        hasActiveFilters={hasActiveFilters}
      />

      {/* KPI cards — row 1 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">Ticket totali</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">
            {statusCounts.OPEN + statusCounts.IN_PROGRESS + statusCounts.WAITING_ON_USER}
          </p>
          <p className="text-xs text-gray-500">Ancora aperti</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">
            {avgResolutionMs ? formatDuration(avgResolutionMs) : "—"}
          </p>
          <p className="text-xs text-gray-500">Tempo medio di risoluzione</p>
          <p className="mt-1 text-[10px] text-gray-400">Dalla creazione a Risolto/Chiuso</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">
            {!hasActiveFilters ? (
              <>
                {last30}
                {trendDelta !== 0 && (
                  <span className={`ml-1 text-sm font-normal ${trendDelta > 0 ? "text-red-600" : "text-green-600"}`}>
                    {trendDelta > 0 ? "▲" : "▼"} {Math.abs(trendDelta)}
                  </span>
                )}
              </>
            ) : total}
          </p>
          <p className="text-xs text-gray-500">
            {!hasActiveFilters ? "Nuovi ticket (ultimi 30gg)" : "Ticket nel periodo"}
          </p>
        </div>
      </div>

      {/* KPI cards — row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">
            {avgFirstResponseMs ? formatDuration(avgFirstResponseMs) : "—"}
          </p>
          <p className="text-xs text-gray-500">Tempo medio prima risposta IT</p>
          <p className="mt-1 text-[10px] text-gray-400">Dalla creazione al primo commento pubblico IT</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-gray-900">{firstResponseCount}</p>
          <p className="text-xs text-gray-500">Ticket con almeno una risposta IT</p>
          <p className="mt-1 text-[10px] text-gray-400">Su {total} totali</p>
        </div>
      </div>

      {/* Trend line chart */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Andamento giornaliero — {!hasActiveFilters ? "ultimi 60 giorni" : filterLabel}
        </h2>
        <TrendChart days={trendDays} />
      </div>

      {/* Donut charts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-gray-900">Per stato</h2>
          <DonutChart data={[
            { label: statusLabels.OPEN,            value: statusCounts.OPEN,            color: statusChartColor.OPEN },
            { label: statusLabels.IN_PROGRESS,     value: statusCounts.IN_PROGRESS,     color: statusChartColor.IN_PROGRESS },
            { label: statusLabels.WAITING_ON_USER, value: statusCounts.WAITING_ON_USER, color: statusChartColor.WAITING_ON_USER },
            { label: statusLabels.RESOLVED,        value: statusCounts.RESOLVED,        color: statusChartColor.RESOLVED },
            { label: statusLabels.CLOSED,          value: statusCounts.CLOSED,          color: statusChartColor.CLOSED },
          ]} />
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-gray-900">Per priorità</h2>
          <DonutChart data={[
            { label: priorityLabels.URGENT, value: priorityCounts.URGENT, color: priorityChartColor.URGENT },
            { label: priorityLabels.HIGH,   value: priorityCounts.HIGH,   color: priorityChartColor.HIGH },
            { label: priorityLabels.MEDIUM, value: priorityCounts.MEDIUM, color: priorityChartColor.MEDIUM },
            { label: priorityLabels.LOW,    value: priorityCounts.LOW,    color: priorityChartColor.LOW },
          ]} />
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-gray-900">Per categoria</h2>
          <DonutChart data={dbCategories.map((c) => ({
            label: c.name,
            value: categoryCountsMap.get(c.id) ?? 0,
            color: c.color,
          }))} />
        </div>
      </div>

      {/* Distribution bars */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-gray-900">Distribuzione per stato</h2>
          {(Object.keys(statusLabels) as TicketStatus[]).map((s) => (
            <DistributionBar
              key={s}
              label={statusLabels[s]}
              count={statusCounts[s]}
              total={total}
              colorClass={statusBarClass[s]}
            />
          ))}
          <div className="border-t border-gray-100 pt-3 space-y-2 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Legenda stati</p>
            <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500" />
              <p><span className="font-semibold text-gray-900 dark:text-white">Risolto</span> — soluzione applicata dal team IT, in attesa di conferma dall&apos;utente.</p>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
              <p><span className="font-semibold text-gray-900 dark:text-white">Chiuso</span> — pratica conclusa formalmente dopo conferma utente o chiusura esplicita con motivazione.</p>
            </div>
          </div>
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-gray-900">Distribuzione per priorità</h2>
          {(Object.keys(priorityLabels) as TicketPriority[]).map((p) => (
            <DistributionBar
              key={p}
              label={priorityLabels[p]}
              count={priorityCounts[p]}
              total={total}
              colorClass={priorityBarClass[p]}
            />
          ))}
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-gray-900">Distribuzione per categoria</h2>
          {dbCategories.map((c) => (
            <DistributionBar
              key={c.id}
              label={c.name}
              count={categoryCountsMap.get(c.id) ?? 0}
              total={total}
              color={c.color}
            />
          ))}
        </div>
      </div>

      {/* Per-tech stats table */}
      {(techResolutionRows.length > 0 || techFirstResponseRows.length > 0) && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Statistiche per tecnico</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="pb-2 text-left">Tecnico</th>
                <th className="pb-2 text-right">Ticket risolti</th>
                <th className="pb-2 text-right">Tempo medio risoluzione</th>
                <th className="pb-2 text-right">Prima risposta media</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const techNames = new Set([
                  ...techResolutionRows.map((r) => r.name),
                  ...techFirstResponseRows.map((r) => r.name),
                ]);
                return [...techNames].map((name) => {
                  const res = techResolutionRows.find((r) => r.name === name);
                  const fr  = techFirstResponseRows.find((r) => r.name === name);
                  return (
                    <tr key={name} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-700">{name}</td>
                      <td className="py-2 text-right text-gray-900">{res?.count ?? "—"}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{res ? formatDuration(res.avg) : "—"}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{fr ? formatDuration(fr.avg) : "—"}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Requesters & workload */}
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
