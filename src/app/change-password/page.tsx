import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { BrandBadge } from "@/app/brand";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user.mustChangePassword) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <BrandBadge />
          <h1 className="text-xl font-semibold text-gray-900">Imposta una nuova password</h1>
          <p className="text-sm text-gray-500">
            Ciao {user.name}, per motivi di sicurezza devi cambiare la password provvisoria prima di continuare.
          </p>
        </div>

        <div className="card p-8">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
