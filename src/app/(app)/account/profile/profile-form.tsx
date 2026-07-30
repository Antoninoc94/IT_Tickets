"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/account";

export function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string | null }) {
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
        <div>
          <label htmlFor="phone" className="field-label">Numero di contatto <span className="font-normal text-[var(--muted)]">(opzionale)</span></label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={phone ?? ""}
            maxLength={30}
            placeholder="Es. 123  oppure  +39 333 123 4567"
            className="field-input max-w-sm"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Interno telefonico o cellulare aziendale — visibile allo staff IT sui tuoi ticket.</p>
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
