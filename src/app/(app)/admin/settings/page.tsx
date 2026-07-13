import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";
import { StorageSection } from "./storage-section";
import { GraphicsSection } from "./graphics-section";

export default async function AdminSettingsPage() {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") redirect("/dashboard");

  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="page-title">Impostazioni</h1>
        <p className="page-subtitle">Personalizza la grafica e i messaggi email dell&apos;applicazione.</p>
      </div>

      <GraphicsSection settings={settings} />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Notifiche email</h2>
        <SettingsForm settings={settings} />
      </div>

      <StorageSection />
    </div>
  );
}
