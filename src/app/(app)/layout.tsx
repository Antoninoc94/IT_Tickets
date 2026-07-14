import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { BrandInline } from "@/app/brand";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const roleBadgeClass: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  IT: "bg-blue-100 text-blue-700",
  USER: "bg-gray-100 text-gray-600",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user.mustChangePassword) redirect("/change-password");

  // Count tickets with unread comments (public comments newer than last view)
  const result = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(DISTINCT t.id)::bigint AS count
      FROM "Ticket" t
      WHERE ${user.role === "USER" ? Prisma.sql`t."requesterId" = ${user.id} AND` : Prisma.sql``}
      EXISTS (
        SELECT 1 FROM "Comment" c
        WHERE c."ticketId" = t.id
          AND c.internal = false
          AND c."createdAt" > COALESCE(
            (SELECT tv."viewedAt" FROM "TicketView" tv
             WHERE tv."userId" = ${user.id} AND tv."ticketId" = t.id),
            '1970-01-01'::timestamptz
          )
          AND c."authorId" != ${user.id}
      )
    `
  );
  const unreadCount = Number(result[0]?.count ?? 0);

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <BrandInline />
            </Link>
            <div className="hidden items-center gap-5 sm:flex">
              <Link href="/dashboard" className="relative text-sm font-medium text-gray-600 hover:text-gray-900">
                Dashboard
                {unreadCount > 0 && (
                  <span className="absolute -right-3 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/tickets/new" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Nuovo ticket
              </Link>
              {user.role !== "USER" && (
                <Link href="/reports" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Report
                </Link>
              )}
              {user.role === "ADMIN" && (
                <>
                  <Link href="/admin/users" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Utenti
                  </Link>
                  <Link href="/admin/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Impostazioni
                  </Link>
                  <Link href="/admin/canned-responses" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Risposte
                  </Link>
                </>
              )}
            </div>
          </nav>
          <div className="flex items-center gap-3">
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
