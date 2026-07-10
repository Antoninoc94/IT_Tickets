"use client";

import { useActionState } from "react";
import { createUser } from "@/app/actions/users";

export function UserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);

  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="field-label" htmlFor="name">
          Nome
        </label>
        <input id="name" name="name" placeholder="Mario Rossi" required className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" placeholder="mario.rossi@azienda.it" required className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          Password provvisoria
        </label>
        <input id="password" name="password" type="password" placeholder="••••••••" required className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="role">
          Ruolo
        </label>
        <select id="role" name="role" defaultValue="USER" className="field-input">
          <option value="USER">Utente</option>
          <option value="IT">IT</option>
          <option value="ADMIN">Administrator</option>
        </select>
      </div>

      <div className="col-span-full flex items-center justify-between border-t border-gray-100 pt-4">
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : <span />}
        <button type="submit" disabled={pending} className="btn-primary ml-auto">
          {pending ? "Creazione..." : "Crea utente"}
        </button>
      </div>
    </form>
  );
}
