"use client";

import { useActionState } from "react";
import { updateKbSettings, type KbSettingsState } from "@/app/actions/settings";

export function KbSection({ settings }: { settings: { kbEnabled: boolean } }) {
  const [state, action, pending] = useActionState<KbSettingsState, FormData>(
    updateKbSettings,
    undefined,
  );

  return (
    <form action={action} className="card space-y-4 p-5">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Knowledge Base abilitata</p>
          <p className="text-xs text-gray-500">
            Abilita la sezione Knowledge Base: pubblica articoli e soluzioni a problemi frequenti.
            Il link apparirà nella navigazione dell&apos;app e i suggerimenti saranno visibili
            nel form &quot;Nuovo ticket&quot;.
          </p>
        </div>
        <input
          type="checkbox"
          name="kbEnabled"
          defaultChecked={settings.kbEnabled}
          className="h-4 w-4 rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Salvato.</p>}

      <div className="flex justify-end border-t border-gray-100 pt-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Salvo..." : "Salva"}
        </button>
      </div>
    </form>
  );
}
