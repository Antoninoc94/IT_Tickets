import { BrandBadge } from "@/app/brand";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandBadge />
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Crea il tuo account</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Inserisci i tuoi dati per registrarti</p>
          </div>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}
