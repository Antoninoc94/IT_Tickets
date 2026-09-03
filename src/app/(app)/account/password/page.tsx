"use client";

import { useActionState } from "react";
import { changePasswordSelf } from "@/app/actions/account";

function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordSelf, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="field-label">Password attuale</label>
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
        <label htmlFor="newPassword" className="field-label">Nuova password</label>
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
        <label htmlFor="confirmPassword" className="field-label">Conferma nuova password</label>
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
      {state?.success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Password cambiata con successo.</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Salvataggio..." : "Cambia password"}
      </button>
    </form>
  );
}

export default function AccountPasswordPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="page-title">Cambia password</h1>
        <p className="page-subtitle">Inserisci la password attuale e scegli quella nuova.</p>
      </div>
      <div className="card p-6">
        <PasswordForm />
      </div>
    </div>
  );
}
