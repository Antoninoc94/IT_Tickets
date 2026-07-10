import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") redirect("/dashboard");

  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="page-title">Impostazioni</h1>
        <p className="page-subtitle">Personalizza l&apos;aspetto e i messaggi email dell&apos;applicazione.</p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
