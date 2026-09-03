"use client";

import { useTransition } from "react";
import { updateUserRole } from "@/app/actions/users";
import type { Role } from "@/generated/prisma/enums";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  IT: "IT",
  USER: "Utente",
};

export function RoleSelect({ userId, role, isSelf }: { userId: string; role: Role; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (isSelf) {
    return <span className="badge bg-purple-100 text-purple-700">{roleLabels[role]}</span>;
  }

  return (
    <select
      defaultValue={role}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateUserRole(userId, e.target.value as Role))}
      className="field-input py-1.5 text-xs"
    >
      {(Object.keys(roleLabels) as Role[]).map((r) => (
        <option key={r} value={r}>
          {roleLabels[r]}
        </option>
      ))}
    </select>
  );
}
