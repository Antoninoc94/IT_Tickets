"use client";

import { useState, useActionState } from "react";
import { wipeAllTickets } from "@/app/actions/attachments";

const CONFIRM_WORD = "ELIMINA";

export function WipeForm() {
  const [state, action, pending] = useActionState(wipeAllTickets, undefined);
  const [input, setInput] = useState("");

  const confirmed = input === CONFIRM_WORD;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Elimina <strong>tutti i ticket</strong>, commenti, allegati ed eventi dalla piattaforma.
        Gli utenti, le categorie e le impostazioni restano intatti.
        Questa operazione è <strong>irreversibile</strong>.
      </p>
      <form action={action} className="space-y-3">
        <div>
          <label className="field-label text-xs">
            Digita <span className="font-mono font-semibold text-red-600">{CONFIRM_WORD}</span> per sbloccare
          </label>
          <input
            type="text"
            name="confirm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            className="field-input w-48 font-mono text-sm"
            placeholder={CONFIRM_WORD}
          />
        </div>
        <button
          type="submit"
          disabled={!confirmed || pending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Eliminazione in corso..." : "Azzera tutti i ticket"}
        </button>
        {state?.error   && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.message && <p className="text-sm text-green-600">{state.message}</p>}
      </form>
    </div>
  );
}
