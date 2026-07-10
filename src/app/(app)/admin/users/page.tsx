import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { UserForm } from "./user-form";
import { UserRowActions } from "./user-row-actions";
import { RoleSelect } from "./role-select";
import { EditProfile } from "./edit-profile";
import type { Role } from "@/generated/prisma/enums";

const tabs: { label: string; role: Role | "ALL" }[] = [
  { label: "Tutti", role: "ALL" },
  { label: "Administrator", role: "ADMIN" },
  { label: "IT", role: "IT" },
  { label: "Utenti", role: "USER" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") redirect("/dashboard");

  const { role: roleParam } = await searchParams;
  const activeRole = tabs.some((t) => t.role === roleParam) ? (roleParam as Role | "ALL") : "ALL";

  const users = await prisma.user.findMany({
    where: activeRole === "ALL" ? {} : { role: activeRole },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Gestione utenti</h1>
        <p className="page-subtitle">Crea account per i colleghi e gestisci ruoli e accessi.</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Nuovo utente</h2>
        <UserForm />
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = tab.role === activeRole;
          return (
            <Link
              key={tab.role}
              href={tab.role === "ALL" ? "/admin/users" : `/admin/users?role=${tab.role}`}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="table-shell">
        <table className="w-full text-left text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Utente</th>
              <th className="px-4 py-3">Ruolo</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="table-row">
                <td className="px-4 py-3">
                  <EditProfile userId={u.id} name={u.name} email={u.email} />
                </td>
                <td className="px-4 py-3">
                  <RoleSelect userId={u.id} role={u.role} isSelf={u.id === current.id} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`badge ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {u.active ? "Attivo" : "Disattivato"}
                    </span>
                    {!u.emailVerifiedAt && <span className="badge bg-amber-100 text-amber-700">Da verificare</span>}
                    {u.mustChangePassword && (
                      <span className="badge bg-amber-100 text-amber-700">Password provvisoria</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <UserRowActions userId={u.id} active={u.active} isSelf={u.id === current.id} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  Nessun utente in questa categoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
