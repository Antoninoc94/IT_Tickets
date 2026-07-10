import { VerifyForm } from "./verify-form";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-white">
            IT
          </span>
          <h1 className="text-xl font-semibold text-gray-900">Verifica la tua email</h1>
          <p className="text-sm text-gray-500">
            Abbiamo inviato un codice a 6 cifre a <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>

        <div className="card p-8">
          <VerifyForm email={email ?? ""} />
        </div>
      </div>
    </div>
  );
}
