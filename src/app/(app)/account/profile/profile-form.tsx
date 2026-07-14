"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/account";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <div className="card space-y-4 p-6">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="name" className="field-label">Nome</label>
          <input
            id="name"
            name="name"
            defaultValue={name}
            required
            minLength={2}
            className="field-input max-w-sm"
          />
        </div>
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            required
            className="field-input max-w-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Salvataggio..." : "Salva"}
          </button>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">Profilo aggiornato.</p>}
        </div>
      </form>
    </div>
  );
}
