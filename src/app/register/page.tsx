import { BrandBadge } from "@/app/brand";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <BrandBadge />
          <h1 className="text-xl font-semibold text-gray-900">Crea il tuo account</h1>
          <p className="text-center text-sm text-gray-500">Usa la tua email aziendale per registrarti</p>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}
