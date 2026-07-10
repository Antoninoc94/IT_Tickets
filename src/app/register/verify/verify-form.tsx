"use client";

import { useActionState } from "react";
import { resendVerificationCode, verifyRegistration } from "@/app/actions/register";

export function VerifyForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyRegistration, undefined);
  const [resendState, resendAction, resendPending] = useActionState(resendVerificationCode, undefined);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <label htmlFor="code" className="field-label">
            Codice di verifica
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            className="field-input text-center text-lg tracking-[0.5em]"
          />
        </div>

        {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Verifica in corso..." : "Verifica e accedi"}
        </button>
      </form>

      <form action={resendAction} className="text-center">
        <input type="hidden" name="email" value={email} />
        <button type="submit" disabled={resendPending} className="text-sm font-medium text-gray-500 hover:text-gray-700">
          {resendPending ? "Invio..." : "Non hai ricevuto il codice? Invia di nuovo"}
        </button>
        {resendState?.error && <p className="mt-2 text-sm text-red-600">{resendState.error}</p>}
        {resendState?.success && <p className="mt-2 text-sm text-green-600">Codice inviato di nuovo.</p>}
      </form>
    </div>
  );
}
