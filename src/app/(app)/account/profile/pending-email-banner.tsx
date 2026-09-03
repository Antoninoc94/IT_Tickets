"use client";

import { useActionState, useState, useTransition } from "react";
import { cancelEmailChange, confirmEmailChange, resendPendingEmailCode } from "@/app/actions/account";

export function PendingEmailBanner({ pendingEmail }: { pendingEmail: string }) {
  const [state, formAction, pending] = useActionState(confirmEmailChange, undefined);
  const [isPending, startTransition] = useTransition();
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  return (
    <div className="card space-y-3 border-amber-200 bg-amber-50 p-5">
      <div>
        <h2 className="text-sm font-semibold text-amber-900">Cambio email in sospeso</h2>
        <p className="mt-0.5 text-sm text-amber-800">
          Abbiamo inviato un codice a 6 cifre a <strong>{pendingEmail}</strong>. Finché non lo confermi, il tuo
          account continua a funzionare normalmente con l&apos;email attuale.
        </p>
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          name="code"
          inputMode="numeric"
          maxLength={6}
          placeholder="Codice a 6 cifre"
          required
          className="field-input w-40 py-1.5 text-sm"
        />
        <button type="submit" disabled={pending} className="btn-primary py-1.5 text-xs">
          {pending ? "Verifica..." : "Conferma"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const res = await resendPendingEmailCode();
              setResendMessage(res?.error ?? "Nuovo codice inviato.");
            })
          }
          className="text-xs font-medium text-amber-800 hover:opacity-80 disabled:opacity-60"
        >
          Invia di nuovo il codice
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => cancelEmailChange())}
          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-60"
        >
          Annulla richiesta
        </button>
      </form>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {resendMessage && <p className="text-xs text-amber-700">{resendMessage}</p>}
    </div>
  );
}
