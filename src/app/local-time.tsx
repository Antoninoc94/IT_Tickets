"use client";

export function LocalTime({ date }: { date: Date | string }) {
  return (
    <span suppressHydrationWarning>
      {new Date(date).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "medium" })}
    </span>
  );
}
