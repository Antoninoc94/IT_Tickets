"use client";

import { useActionState } from "react";
import { createUser } from "@/app/actions/users";

export function UserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);

  return (
    <form action={action} className="grid grid-cols-4 gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <input
        name="name"
        placeholder="Nome"
        required
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        name="password"
        type="password"
        placeholder="Password provvisoria"
        required
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <select name="role" defaultValue="USER" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
        <option value="USER">Utente</option>
        <option value="IT">IT</option>
        <option value="ADMIN">Administrator</option>
      </select>

      <div className="col-span-4 flex items-center justify-between">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Creazione..." : "Crea utente"}
        </button>
      </div>
    </form>
  );
}
