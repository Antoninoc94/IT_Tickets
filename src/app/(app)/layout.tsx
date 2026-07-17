import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { BrandInline } from "@/app/brand";
import { UnreadBadge } from "./unread-badge";
import { ThemeToggle } from "@/app/theme-toggle";
import { NavDropdown } from "./nav-dropdown";
import { MobileNav } from "./mobile-nav";

const roleBadgeClass: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  IT: "bg-blue-100 text-blue-700",
  USER: "bg-gray-100 text-gray-600",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user.mustChangePassword) redirect("/change-password");

  const isStaff = user.role !== "USER";
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">

          {/* Left: logo + main nav */}
          <nav className="flex items-center gap-5">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 text-base font-semibold text-gray-900">
              <BrandInline />
            </Link>

            <MobileNav isStaff={isStaff} isAdmin={isAdmin} />

            <div className="hidden items-center gap-4 sm:flex">
              <Link href="/dashboard" className="relative text-sm font-medium text-gray-600 hover:text-gray-900">
                Dashboard
                <UnreadBadge />
              </Link>

              <Link href="/tickets/new" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Nuovo ticket
              </Link>

              {isStaff && (
                <>
                  <Link href="/reports" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Report
                  </Link>
                  <NavDropdown
                    label="Gestione"
                    items={[
                      { href: "/admin/tags",             label: "Etichette" },
                      { href: "/admin/templates",        label: "Modelli" },
                      { href: "/admin/categories",       label: "Categorie" },
                      { href: "/admin/canned-responses", label: "Risposte rapide" },
                    ]}
                  />
                </>
              )}

              {isAdmin && (
                <NavDropdown
                  label="Admin"
                  items={[
                    { href: "/admin/users",    label: "Utenti" },
                    { href: "/admin/settings", label: "Impostazioni" },
                  ]}
                />
              )}
            </div>
          </nav>

          {/* Right: theme toggle + user info + logout */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="hidden text-right sm:block">
              <Link href="/account/profile" className="text-sm font-medium text-gray-900 hover:text-[var(--brand)]">
                {user.name}
              </Link>
              <div>
                <span className={`badge ${roleBadgeClass[user.role]}`}>{user.role}</span>
              </div>
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
