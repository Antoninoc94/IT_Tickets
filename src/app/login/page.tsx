import { getSettings } from "@/lib/settings";
import { BrandBadge } from "@/app/brand";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <BrandBadge />
          <h1 className="text-xl font-semibold text-gray-900">{settings.appName}</h1>
          <p className="text-sm text-gray-500">Accedi con le tue credenziali aziendali</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
