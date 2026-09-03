"use client";

export function LocalTime({ date, timeOnly = false }: { date: Date | string; timeOnly?: boolean }) {
  const d = new Date(date);
  const full = d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "medium" });

  if (timeOnly) {
    return (
      <span suppressHydrationWarning title={full}>
        {d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }

  return <span suppressHydrationWarning>{full}</span>;
}
