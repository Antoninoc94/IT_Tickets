import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { ProfileForm } from "./profile-form";
import { PendingEmailBanner } from "./pending-email-banner";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  const fullUser = await import("@/lib/prisma").then(({ prisma }) =>
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true } })
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="page-title">Il mio profilo</h1>
        <p className="page-subtitle">Aggiorna le tue informazioni di contatto.</p>
      </div>

      {user.pendingEmail && <PendingEmailBanner pendingEmail={user.pendingEmail} />}

      <ProfileForm name={user.name} email={user.email} phone={fullUser.phone} />

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900">Sicurezza</h2>
        <p className="mt-0.5 text-sm text-gray-500">Modifica la password di accesso.</p>
        <Link href="/account/password" className="mt-3 inline-block text-sm font-medium text-[var(--brand)] hover:opacity-80">
          Cambia password →
        </Link>
      </div>
    </div>
  );
}
