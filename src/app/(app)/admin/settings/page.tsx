import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";
import { StorageSection } from "./storage-section";
import { GraphicsSection } from "./graphics-section";
import { SlaSection } from "./sla-section";

export default async function AdminSettingsPage() {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") redirect("/dashboard");

  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="page-title">Impostazioni</h1>
        <p className="page-subtitle">Grafica, SLA, notifiche email e archiviazione.</p>
      </div>

      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Grafica</h2>
          <p className="mt-0.5 text-xs text-gray-400">Nome, colore del brand, logo e icona del browser.</p>
        </div>
        <GraphicsSection settings={settings} />
      </section>

      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">SLA</h2>
          <p className="mt-0.5 text-xs text-gray-400">Ore dalla creazione del ticket entro cui deve essere risolto, per priorità.</p>
        </div>
        <SlaSection settings={settings} />
      </section>

      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Notifiche email</h2>
          <p className="mt-0.5 text-xs text-gray-400">Template per le email automatiche inviate agli utenti e al team IT.</p>
        </div>
        <SettingsForm settings={settings} />
      </section>

      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Archiviazione</h2>
          <p className="mt-0.5 text-xs text-gray-400">Spazio usato dagli allegati e pulizia automatica.</p>
        </div>
        <StorageSection />
      </section>
    </div>
  );
}
