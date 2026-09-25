import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtDate, useAdminData } from "@/lib/super-admin";

export const Route = createFileRoute("/_authenticated/super-admin/users")({
  component: UsersPage,
});

const ROLE: Record<string, string> = { owner: "Proprietario", client: "Cliente", super_admin: "Super Admin" };

function UsersPage() {
  const { users, salons } = useAdminData();
  const [q, setQ] = useState("");
  const rows = (users.data ?? []).filter((u) => `${u.email} ${u.full_name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Utenti</h1>
      {users.isError && <p className="text-sm text-destructive">Impossibile caricare gli utenti.</p>}
      <Input placeholder="Cerca per email o nome…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              {["Email", "Nome", "Ruolo", "Punto vendita", "Registrato", "Ultimo aggiornamento"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.full_name || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => <Badge key={r} variant="outline">{ROLE[r] ?? r}</Badge>)}
                  </div>
                </td>
                <td className="px-4 py-3">{(salons.data ?? []).find((s) => s.owner_id === u.id)?.name ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(u.updated_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nessun utente.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
