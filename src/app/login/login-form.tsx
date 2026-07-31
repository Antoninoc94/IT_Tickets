"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="card p-8">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="username" className="field-input" />
        </div>

        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="field-input"
          />
        </div>

        {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Non hai un account?{" "}
        <Link href="/register" className="link-brand">
          Registrati
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-gray-500">
        <Link href="/guida" className="link-brand">
          Leggi la guida utente
        </Link>
      </p>
    </div>
  );
}
