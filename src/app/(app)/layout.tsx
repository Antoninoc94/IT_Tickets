import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";

const roleBadgeClass: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  IT: "bg-blue-100 text-blue-700",
  USER: "bg-gray-100 text-gray-600",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user.mustChangePassword) redirect("/change-password");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <span className="brand-mark flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-white">
                IT
              </span>
              Tickets
            </Link>
            <div className="hidden items-center gap-5 sm:flex">
              <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/tickets/new" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Nuovo ticket
              </Link>
              {user.role === "ADMIN" && (
                <>
                  <Link href="/admin/users" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Utenti
                  </Link>
                  <Link href="/admin/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Impostazioni
                  </Link>
                </>
              )}
            </div>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <span className={`badge ${roleBadgeClass[user.role]}`}>{user.role}</span>
            </div>
            <form action={logout}>
              <button type="submit" className="btn-ghost">
                Esci
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
