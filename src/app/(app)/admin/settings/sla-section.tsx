"use client";

import { useActionState, useState } from "react";
import { updateSla } from "@/app/actions/settings";
import type { SettingModel as Setting } from "@/generated/prisma/models/Setting";

const WEEKDAYS = [
  { iso: 1, label: "Lun" },
  { iso: 2, label: "Mar" },
  { iso: 3, label: "Mer" },
  { iso: 4, label: "Gio" },
  { iso: 5, label: "Ven" },
  { iso: 6, label: "Sab" },
  { iso: 7, label: "Dom" },
];

const hourFields: { label: string; name: keyof Setting; hint: string }[] = [
  { label: "Urgente", name: "slaUrgentHours",  hint: "es. 4"  },
  { label: "Alta",    name: "slaHighHours",     hint: "es. 8"  },
  { label: "Media",   name: "slaMediumHours",   hint: "es. 24" },
  { label: "Bassa",   name: "slaLowHours",      hint: "es. 72" },
];

export function SlaSection({ settings }: { settings: Setting }) {
  const [state, action, pending] = useActionState(updateSla, undefined);
  const [bizHours, setBizHours] = useState(settings.slaBusinessHours);

  const currentWorkDays = (settings.slaWorkDays ?? "1,2,3,4,5").split(",").map(Number);

  return (
    <div className="card space-y-4 p-6">
      <form action={action} className="space-y-4">
        <p className="text-xs text-gray-400">Lascia vuoto per disabilitare il controllo SLA per quella priorità.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {hourFields.map((f) => (
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

        {/* Business hours toggle */}
        <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="slaBusinessHours"
              value="on"
              defaultChecked={settings.slaBusinessHours}
              onChange={(e) => setBizHours(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Conta solo ore lavorative
            </span>
          </label>
          <p className="ml-7 mt-1 text-xs text-gray-400">
            Se attivo, il conteggio SLA esclude notti e giorni non lavorativi. Gli orari sono in UTC — sottrai 1 h (CET) o 2 h (CEST) per il fuso italiano.
          </p>
        </div>

        {/* Work-hours config — always rendered so values are always submitted */}
        <div className={bizHours ? "ml-7 space-y-4" : "hidden"}>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="field-label" htmlFor="slaWorkdayStart">Inizio</label>
              <div className="flex items-center gap-1.5">
                <input
                  id="slaWorkdayStart"
                  name="slaWorkdayStart"
                  type="number"
                  min="0"
                  max="22"
                  defaultValue={settings.slaWorkdayStart ?? 9}
                  className="field-input w-20"
                />
                <span className="shrink-0 text-xs text-gray-400">:00 UTC</span>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="slaWorkdayEnd">Fine</label>
              <div className="flex items-center gap-1.5">
                <input
                  id="slaWorkdayEnd"
                  name="slaWorkdayEnd"
                  type="number"
                  min="1"
                  max="23"
                  defaultValue={settings.slaWorkdayEnd ?? 18}
                  className="field-input w-20"
                />
                <span className="shrink-0 text-xs text-gray-400">:00 UTC</span>
              </div>
            </div>
          </div>

          <div>
            <p className="field-label">Giorni lavorativi</p>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map(({ iso, label }) => (
                <label key={iso} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="slaWorkDay"
                    value={String(iso)}
                    defaultChecked={currentWorkDays.includes(iso)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Salvataggio..." : "Salva SLA"}
          </button>
          {state?.error   && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">SLA aggiornato.</p>}
        </div>
      </form>
    </div>
  );
}
