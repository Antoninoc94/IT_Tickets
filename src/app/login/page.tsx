import { getSettings } from "@/lib/settings";
import { BrandBadge } from "@/app/brand";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">

        {/* Logo + title — outside the card */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandBadge />
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{settings.appName}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Portale di supporto IT</p>
          </div>
        </div>

        <LoginForm />

      </div>
    </div>
  );
}
