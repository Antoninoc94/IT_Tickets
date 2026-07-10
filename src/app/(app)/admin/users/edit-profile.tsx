"use client";

import { useActionState, useState } from "react";
import { updateUserProfile } from "@/app/actions/users";

export function EditProfile({ userId, name, email }: { userId: string; name: string; email: string }) {
  const [editing, setEditing] = useState(false);
  const action = updateUserProfile.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, undefined);

  // Close the inline form once a save succeeds. Adjusting state during
  // render (rather than in an effect) per https://react.dev/learn/you-might-not-need-an-effect
  const [handledSuccess, setHandledSuccess] = useState(state?.success);
  if (state?.success !== handledSuccess) {
    setHandledSuccess(state?.success);
    if (state?.success) setEditing(false);
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-left hover:opacity-80">
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">{email}</p>
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input name="name" defaultValue={name} className="field-input py-1 text-sm" />
      <input name="email" type="email" defaultValue={email} className="field-input py-1 text-sm" />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="link-brand text-xs disabled:opacity-60">
          {pending ? "..." : "Salva"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
          Annulla
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
