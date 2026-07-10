import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { UserForm } from "./user-form";
import { UserRowActions } from "./user-row-actions";

const roleBadgeClass: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  IT: "bg-blue-100 text-blue-700",
  USER: "bg-gray-100 text-gray-600",
};

export default async function AdminUsersPage() {
  const current = await getCurrentUser();
  if (current.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Gestione utenti</h1>
        <p className="page-subtitle">Crea account per i colleghi e gestisci i ruoli di accesso.</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Nuovo utente</h2>
        <UserForm />
      </div>

      <div className="table-shell">
        <table className="w-full text-left text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Ruolo</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="table-row">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${roleBadgeClass[u.role]}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.active ? "Attivo" : "Disattivato"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <UserRowActions userId={u.id} active={u.active} isSelf={u.id === current.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
