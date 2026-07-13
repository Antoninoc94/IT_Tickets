"use client";

import { useActionState, useState } from "react";
import { removeLogo, updateGraphics, uploadLogo } from "@/app/actions/settings";
import type { SettingModel as Setting } from "@/generated/prisma/models/Setting";

function GraphicsFields({ settings }: { settings: Setting }) {
  const [state, action, pending] = useActionState(updateGraphics, undefined);
  const [brandColor, setBrandColor] = useState(settings.brandColor);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="appName" className="field-label">
          Nome applicazione
        </label>
        <input
          id="appName"
          name="appName"
          defaultValue={settings.appName}
          required
          maxLength={40}
          className="field-input max-w-sm"
        />
      </div>

      <div>
        <label className="field-label">Colore principale</label>
        <p className="mb-2 text-xs text-gray-400">Usato per bottoni, link e badge attivi.</p>
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

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Salvataggio..." : "Salva"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-600">Salvato.</p>}
      </div>
    </form>
  );
}

const LOGO_MAX_MB = 2;

function LogoUpload({ settings }: { settings: Setting }) {
  const [state, action, pending] = useActionState(uploadLogo, undefined);
  const [logoError, setLogoError] = useState<string | null>(null);

  return (
    <div className="space-y-3 border-t border-gray-100 pt-4">
      <div>
        <label className="field-label">Logo aziendale</label>
        <p className="text-xs text-gray-400">
          PNG, JPG o WebP, max 2 MB. Sostituisce il badge con le iniziali in tutta l&apos;app. Consigliato uno sfondo
          trasparente.
        </p>
      </div>

      {settings.logoStorageKey && (
        <div className="flex items-center gap-4">
          <div className="flex h-16 items-center rounded-md border border-gray-200 bg-gray-50 px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/branding/logo?v=${settings.logoStorageKey}`}
              alt="Logo attuale"
              className="h-10 w-auto max-w-[12rem] object-contain"
            />
          </div>
          <form action={removeLogo}>
            <button type="submit" className="text-sm font-medium text-red-600 hover:text-red-800">
              Rimuovi logo
            </button>
          </form>
        </div>
      )}

      <form action={action} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp"
          required
          className="field-input max-w-xs file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setLogoError(file && file.size > LOGO_MAX_MB * 1024 * 1024 ? `Il file supera il limite di ${LOGO_MAX_MB} MB.` : null);
          }}
        />
        <button type="submit" disabled={pending || !!logoError} className="btn-secondary">
          {pending ? "Caricamento..." : settings.logoStorageKey ? "Sostituisci logo" : "Carica logo"}
        </button>
        {logoError && <p className="text-sm text-red-600">{logoError}</p>}
        {!logoError && state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}

export function GraphicsSection({ settings }: { settings: Setting }) {
  return (
    <div className="card space-y-5 p-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Grafica</h2>
        <p className="mt-0.5 text-sm text-gray-500">Nome, colore e logo dell&apos;applicazione.</p>
      </div>
      <GraphicsFields settings={settings} />
      <LogoUpload settings={settings} />
    </div>
  );
}
