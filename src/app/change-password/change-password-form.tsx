"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/account";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="field-label">
          Password provvisoria
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="field-label">
          Nuova password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Conferma nuova password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field-input"
        />
      </div>

      {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Salvataggio..." : "Salva e continua"}
      </button>
    </form>
  );
}
