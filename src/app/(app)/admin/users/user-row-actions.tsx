"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteUser, resetUserPassword, toggleUserActive } from "@/app/actions/users";

function generatePassword() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 12);
}

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const action = resetUserPassword.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [password, setPassword] = useState(generatePassword());

  useEffect(() => {
    if (state?.success) onDone();
  }, [state?.success, onDone]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        type="text"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="field-input w-40 py-1 font-mono text-xs"
      />
      <button
        type="button"
        onClick={() => setPassword(generatePassword())}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        Genera
      </button>
      <button type="submit" disabled={pending} className="link-brand text-sm disabled:opacity-60">
        {pending ? "..." : "Imposta"}
      </button>
      <button type="button" onClick={onDone} className="text-sm text-gray-400 hover:text-gray-600">
        Annulla
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function UserRowActions({ userId, active, isSelf }: { userId: string; active: boolean; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "reset">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isSelf) return <span className="text-xs text-gray-400">Tu</span>;

  if (mode === "reset") {
    return <ResetPasswordForm userId={userId} onDone={() => setMode("idle")} />;
  }

  const handleDelete = () => {
    if (!confirm("Eliminare definitivamente questo utente? L'operazione non è reversibile.")) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result?.error) setDeleteError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <button
          disabled={isPending}
          onClick={() => startTransition(() => toggleUserActive(userId))}
          className="link-brand text-sm disabled:opacity-60"
        >
          {active ? "Disattiva" : "Riattiva"}
        </button>
        <button
          disabled={isPending}
          onClick={() => setMode("reset")}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-60"
        >
          Reset password
        </button>
        <button
          disabled={isPending}
          onClick={handleDelete}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-60"
        >
          Elimina
        </button>
      </div>
      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
    </div>
  );
}
