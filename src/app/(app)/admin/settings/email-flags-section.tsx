"use client";

import { useActionState } from "react";
import { updateEmailFlags, type EmailFlagsState } from "@/app/actions/settings";

type Settings = {
  emailEnabled: boolean;
  digestEnabled: boolean;
  reminderDays: number | null;
};

export function EmailFlagsSection({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<EmailFlagsState, FormData>(updateEmailFlags, undefined);

  return (
    <form action={action} className="card space-y-4 p-5">
      <label className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Invio email abilitato</p>
          <p className="text-xs text-gray-500">Disabilita per bloccare tutte le email (utile in fase di test).</p>
        </div>
        <input type="checkbox" name="emailEnabled" defaultChecked={settings.emailEnabled} className="h-4 w-4 rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]" />
      </label>

      <label className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Digest giornaliero</p>
          <p className="text-xs text-gray-500">Invia ogni mattina un riepilogo dei ticket aperti a tutto il team IT.</p>
        </div>
        <input type="checkbox" name="digestEnabled" defaultChecked={settings.digestEnabled} className="h-4 w-4 rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]" />
      </label>

      <div className="border-t border-gray-100 pt-4">
        <label className="block">
          <p className="text-sm font-medium text-gray-900">Promemoria automatico (giorni)</p>
          <p className="mb-2 text-xs text-gray-500">Invia un promemoria al tecnico assegnato se il ticket è inattivo da N giorni. Lascia vuoto per disabilitare.</p>
          <input
            type="number"
            name="reminderDays"
            min="1"
            max="365"
            defaultValue={settings.reminderDays ?? ""}
            placeholder="es. 3"
            className="field-input w-32"
          />
        </label>
      </div>

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
