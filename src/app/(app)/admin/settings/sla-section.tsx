"use client";

import { useActionState } from "react";
import { updateSla } from "@/app/actions/settings";
import type { SettingModel as Setting } from "@/generated/prisma/models/Setting";

export function SlaSection({ settings }: { settings: Setting }) {
  const [state, action, pending] = useActionState(updateSla, undefined);

  const fields: { label: string; name: keyof Setting; hint: string }[] = [
    { label: "Urgente", name: "slaUrgentHours", hint: "es. 4" },
    { label: "Alta", name: "slaHighHours", hint: "es. 8" },
    { label: "Media", name: "slaMediumHours", hint: "es. 24" },
    { label: "Bassa", name: "slaLowHours", hint: "es. 72" },
  ];

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">SLA — Tempo massimo di risposta</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Ore dalla creazione del ticket entro cui deve essere risolto. Lascia vuoto per disabilitare la priorità.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="field-label" htmlFor={f.name}>{f.label}</label>
              <div className="flex items-center gap-1.5">
                <input
                  id={f.name}
                  name={f.name}
                  type="number"
                  min="1"
                  max="8760"
                  placeholder={f.hint}
                  defaultValue={(settings[f.name] as number | null) ?? ""}
                  className="field-input"
                />
                <span className="shrink-0 text-xs text-gray-400">ore</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Salvataggio..." : "Salva SLA"}
          </button>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">SLA aggiornato.</p>}
        </div>
      </form>
    </div>
  );
}
