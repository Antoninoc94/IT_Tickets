"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/app/actions/register";

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);

  return (
    <div className="card p-8">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="field-label">Nome</label>
            <input id="firstName" name="firstName" required autoComplete="given-name" className="field-input" />
          </div>
          <div>
            <label htmlFor="lastName" className="field-label">Cognome</label>
            <input id="lastName" name="lastName" required autoComplete="family-name" className="field-input" />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="field-label">
            Email aziendale
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
            minLength={8}
            autoComplete="new-password"
            className="field-input"
          />
        </div>

        {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Registrazione in corso..." : "Registrati"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Hai già un account?{" "}
        <Link href="/login" className="link-brand">
          Accedi
        </Link>
      </p>
    </div>
  );
}
