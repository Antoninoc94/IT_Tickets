"use client";

import { useActionState, useState } from "react";
import { updateSettings } from "@/app/actions/settings";
import type { SettingModel as Setting } from "@/generated/prisma/models/Setting";

const templateSections: {
  title: string;
  description: string;
  variables: string[];
  subjectField: keyof Setting;
  bodyField: keyof Setting;
}[] = [
  {
    title: "Nuovo ticket",
    description: "Inviata a IT e Administrator quando un utente apre un ticket.",
    variables: ["ticketTitle", "ticketDescription", "requesterName", "ticketUrl"],
    subjectField: "newTicketEmailSubject",
    bodyField: "newTicketEmailBody",
  },
  {
    title: "Ticket assegnato",
    description: "Inviata al membro IT quando gli viene assegnato un ticket.",
    variables: ["ticketTitle", "ticketUrl"],
    subjectField: "assignedEmailSubject",
    bodyField: "assignedEmailBody",
  },
  {
    title: "Cambio stato",
    description: "Inviata al richiedente quando lo stato del ticket cambia.",
    variables: ["ticketTitle", "status", "ticketUrl"],
    subjectField: "statusChangedEmailSubject",
    bodyField: "statusChangedEmailBody",
  },
  {
    title: "Nuovo commento",
    description: "Inviata al richiedente quando riceve un commento pubblico.",
    variables: ["ticketTitle", "authorName", "commentBody", "ticketUrl"],
    subjectField: "newCommentEmailSubject",
    bodyField: "newCommentEmailBody",
  },
];

export function SettingsForm({ settings }: { settings: Setting }) {
  const [state, action, pending] = useActionState(updateSettings, undefined);
  const [brandColor, setBrandColor] = useState(settings.brandColor);

  return (
    <form action={action} className="space-y-6">
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Aspetto</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Il colore principale usato per bottoni, link e badge attivi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-md border border-gray-300"
            aria-label="Colore principale"
          />
          <input
            type="text"
            name="brandColor"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            pattern="^#[0-9a-fA-F]{6}$"
            className="field-input max-w-[10rem] font-mono"
          />
        </div>
      </div>

      {templateSections.map((section) => (
        <div key={section.title} className="card space-y-4 p-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{section.title}</h2>
            <p className="mt-0.5 text-sm text-gray-500">{section.description}</p>
            <p className="mt-1 text-xs text-gray-400">
              Variabili disponibili: {section.variables.map((v) => `{{${v}}}`).join(", ")}
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor={section.subjectField}>
              Oggetto
            </label>
            <input
              id={section.subjectField}
              name={section.subjectField}
              defaultValue={settings[section.subjectField] as string}
              required
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label" htmlFor={section.bodyField}>
              Corpo
            </label>
            <textarea
              id={section.bodyField}
              name={section.bodyField}
              defaultValue={settings[section.bodyField] as string}
              required
              rows={4}
              className="field-input font-mono text-xs"
            />
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-600">Impostazioni salvate.</p>}
        <button type="submit" disabled={pending} className="btn-primary ml-auto">
          {pending ? "Salvataggio..." : "Salva impostazioni"}
        </button>
      </div>
    </form>
  );
}
