"use client";

import { useActionState } from "react";
import { createCannedResponse, deleteCannedResponse, type CannedResponseState } from "@/app/actions/canned-responses";

type CannedResponse = { id: string; title: string; body: string };

function DeleteButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (confirm("Eliminare questa risposta?")) await deleteCannedResponse(id);
      }}
      className="text-xs text-red-600 hover:text-red-800"
    >
      Elimina
    </button>
  );
}

function NewResponseForm() {
  const [state, action, pending] = useActionState<CannedResponseState, FormData>(createCannedResponse, undefined);

  return (
    <form action={action} className="card space-y-3 p-4">
      <h2 className="text-sm font-semibold text-gray-900">Nuova risposta</h2>
      <div>
        <label className="label-text">Titolo</label>
        <input name="title" type="text" required className="field-input" placeholder="es. Richiesta informazioni aggiuntive" />
      </div>
      <div>
        <label className="label-text">Testo</label>
        <textarea name="body" required rows={4} className="field-input" placeholder="Scrivi il testo della risposta..." />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Salvo..." : "Aggiungi"}
        </button>
      </div>
    </form>
  );
}

export function CannedResponsesClient({ responses }: { responses: CannedResponse[] }) {
  return (
    <div className="space-y-6">
      <NewResponseForm />
      {responses.length === 0 ? (
        <p className="text-sm text-gray-500">Nessuna risposta predefinita.</p>
      ) : (
        <div className="card divide-y divide-gray-100">
          {responses.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{r.title}</p>
                <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{r.body}</p>
              </div>
              <DeleteButton id={r.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
