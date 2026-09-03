"use client";

import { useActionState, useState } from "react";
import { updateEmailFlags, type EmailFlagsState } from "@/app/actions/settings";

type Settings = {
  emailEnabled: boolean;
  digestEnabled: boolean;
  reminderDays: number | null;
  autoCloseDays: number | null;
  emailProvider: string;
};

type GraphEnvStatus = {
  tenantId: boolean;
  clientId: boolean;
  clientSecret: boolean;
  senderEmail: boolean;
};

export function EmailFlagsSection({
  settings,
  graphEnvStatus,
}: {
  settings: Settings;
  graphEnvStatus: GraphEnvStatus;
}) {
  const [state, action, pending] = useActionState<EmailFlagsState, FormData>(updateEmailFlags, undefined);
  const [provider, setProvider] = useState(settings.emailProvider ?? "smtp");

  const graphReady = Object.values(graphEnvStatus).every(Boolean);

  return (
    <form action={action} className="card space-y-4 p-5">
      {/* Provider selection */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-900">Provider email</p>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="emailProvider"
              value="smtp"
              checked={provider === "smtp"}
              onChange={() => setProvider("smtp")}
              className="mt-0.5 h-4 w-4 border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">SMTP</p>
              <p className="text-xs text-gray-500">Server SMTP classico (SMTP_HOST, SMTP_PORT, …).</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="emailProvider"
              value="graph"
              checked={provider === "graph"}
              onChange={() => setProvider("graph")}
              className="mt-0.5 h-4 w-4 border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Microsoft Graph API (Office 365)</p>
              <p className="text-xs text-gray-500">Invia tramite un account Microsoft 365 usando le credenziali nel file .env.</p>
            </div>
          </label>
        </div>

        {/* Graph env var status panel */}
        {provider === "graph" && (
          <div className={`mt-3 rounded-md border p-3 text-xs ${graphReady ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <p className={`mb-2 font-medium ${graphReady ? "text-green-800" : "text-amber-800"}`}>
              {graphReady ? "Tutte le variabili d'ambiente sono configurate." : "Alcune variabili d'ambiente mancano. Aggiungile al file .env e riavvia il server."}
            </p>
            <ul className="space-y-1">
              {(
                [
                  ["GRAPH_TENANT_ID", graphEnvStatus.tenantId],
                  ["GRAPH_CLIENT_ID", graphEnvStatus.clientId],
                  ["GRAPH_CLIENT_SECRET", graphEnvStatus.clientSecret],
                  ["GRAPH_SENDER_EMAIL", graphEnvStatus.senderEmail],
                ] as [string, boolean][]
              ).map(([key, ok]) => (
                <li key={key} className="flex items-center gap-2">
                  <span className={ok ? "text-green-600" : "text-red-500"}>{ok ? "✓" : "✗"}</span>
                  <code className={ok ? "text-green-800" : "text-red-700"}>{key}</code>
                  {!ok && <span className="text-amber-700">— non impostata</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <label className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
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

      <div className="border-t border-gray-100 pt-4">
        <label className="block">
          <p className="text-sm font-medium text-gray-900">Chiusura automatica ticket Risolti (giorni)</p>
          <p className="mb-2 text-xs text-gray-500">I ticket in stato <strong>Risolto</strong> vengono chiusi automaticamente se non ci sono aggiornamenti dopo N giorni. Lascia vuoto per disabilitare.</p>
          <input
            type="number"
            name="autoCloseDays"
            min="1"
            max="365"
            defaultValue={settings.autoCloseDays ?? ""}
            placeholder="es. 7"
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
