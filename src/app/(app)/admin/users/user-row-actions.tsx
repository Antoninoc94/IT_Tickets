"use client";

import { useTransition } from "react";
import { toggleUserActive } from "@/app/actions/users";

export function UserRowActions({ userId, active, isSelf }: { userId: string; active: boolean; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (isSelf) return <span className="text-xs text-gray-400">Tu</span>;

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => toggleUserActive(userId))}
      className="link-brand text-sm disabled:opacity-60"
    >
      {active ? "Disattiva" : "Riattiva"}
    </button>
  );
}
