import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-gray-900">
              IT Tickets
            </Link>
            <Link href="/tickets/new" className="text-sm text-gray-600 hover:text-gray-900">
              Nuovo ticket
            </Link>
            {user.role === "ADMIN" && (
              <Link href="/admin/users" className="text-sm text-gray-600 hover:text-gray-900">
                Utenti
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {user.name} · {user.role}
            </span>
            <form action={logout}>
              <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
                Esci
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
