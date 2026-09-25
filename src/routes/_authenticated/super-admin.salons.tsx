import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtDate, salonSetup, useAdminData } from "@/lib/super-admin";

export const Route = createFileRoute("/_authenticated/super-admin/salons")({
  component: SalonsPage,
});

const labels = { profilo: "Profilo", servizi: "Servizi", orari: "Orari", ricevuti: "Ricevuti", gestiti: "Gestiti" };

function SalonsPage() {
  const { salons, services, hours, appointments, users } = useAdminData();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const d = { services: services.data ?? [], hours: hours.data ?? [], appts: appointments.data ?? [] };
  const rows = (salons.data ?? [])
    .map((s) => ({ s, st: salonSetup(s, d), owner: (users.data ?? []).find((u) => u.id === s.owner_id) }))
    .filter(({ s, owner }) =>
      `${s.name} ${s.email ?? ""} ${owner?.email ?? ""}`.toLowerCase().includes(q.toLowerCase()),
    )
    .filter(({ st }) => (filter === "complete" ? st.pct === 100 : filter === "incomplete" ? st.pct < 100 : true));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Punti vendita</h1>
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Cerca per nome o email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Tutti</option>
          <option value="complete">Configurazione completa</option>
          <option value="incomplete">Configurazione incompleta</option>
        </select>
      </div>
      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              {["Nome", "Proprietario", "Email", "Stato", "Servizi", "Appuntamenti", "Configurazione", "Registrato"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ s, st, owner }) => (
              <tr key={s.id} className="align-top">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{owner?.full_name || owner?.email || (s.owner_id ? "—" : "Demo")}</td>
                <td className="px-4 py-3">{s.email || owner?.email || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{st.checks.servizi ? "Attivo" : "Non attivo"}</Badge>
                </td>
                <td className="px-4 py-3">{st.serviceCount}</td>
                <td className="px-4 py-3">{st.apptCount}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{st.pct}%</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(st.checks).map(([k, v]) => (
                      <span key={k} className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs ${v ? "border-primary/40 text-foreground" : "border-border text-muted-foreground"}`}>
                        {v ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {labels[k as keyof typeof labels]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(s.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nessun punto vendita.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
