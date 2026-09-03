import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { BrandBadge } from "@/app/brand";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user.mustChangePassword) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandBadge />
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Imposta una nuova password</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ciao {user.name}, per motivi di sicurezza devi cambiare la password provvisoria prima di continuare.
            </p>
          </div>
        </div>

        <div className="card p-8">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
