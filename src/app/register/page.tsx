"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/app/actions/register";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-white">
            IT
          </span>
          <h1 className="text-xl font-semibold text-gray-900">Crea il tuo account</h1>
          <p className="text-center text-sm text-gray-500">Usa la tua email aziendale per registrarti</p>
        </div>

        <div className="card p-8">
          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="name" className="field-label">
                Nome
              </label>
              <input id="name" name="name" required className="field-input" />
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

            {state?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
            )}

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
      </div>
    </div>
  );
}
