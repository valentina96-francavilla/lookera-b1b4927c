import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, toDateKey } from "@/lib/lookera";
import { fmtDate, useAdminData } from "@/lib/super-admin";

export const Route = createFileRoute("/_authenticated/super-admin/")({
  component: Overview,
});

function Overview() {
  const { salons, services, appointments, users } = useAdminData();
  const today = toDateKey(new Date());
  const monthAgo = Date.now() - 30 * 86400000;
  const s = salons.data ?? [];
  const a = appointments.data ?? [];
  const u = users.data ?? [];
  const activeSalonIds = new Set((services.data ?? []).filter((x) => x.is_active).map((x) => x.salon_id));

  const kpis = [
    ["Punti vendita totali", s.length],
    ["Punti vendita attivi", s.filter((x) => activeSalonIds.has(x.id)).length],
    ["Nuovi (30 giorni)", s.filter((x) => new Date(x.created_at).getTime() > monthAgo).length],
    ["Utenti registrati", u.length],
    ["Appuntamenti totali", a.length],
    ["Appuntamenti oggi", a.filter((x) => x.appointment_date === today).length],
    ["Completati", a.filter((x) => x.status === "completed").length],
    ["Cancellati", a.filter((x) => x.status === "cancelled").length],
  ] as const;

  const salonName = (id: string) => s.find((x) => x.id === id)?.name ?? "—";
  const events = [
    ...s.map((x) => ({ at: x.created_at, text: `Nuovo punto vendita: ${x.name}` })),
    ...u.map((x) => ({ at: x.created_at, text: `Nuovo utente: ${x.email}` })),
    ...a.map((x) => ({
      at: x.created_at,
      text: `Appuntamento ${STATUS_LABELS[x.status as keyof typeof STATUS_LABELS]?.toLowerCase() ?? x.status} · ${salonName(x.salon_id)} · ${x.customer_name || "Cliente"}`,
    })),
  ]
    .sort((p, q) => q.at.localeCompare(p.at))
    .slice(0, 12);

  const ok = (q: { isError: boolean; isLoading: boolean }) =>
    q.isLoading ? "Verifica…" : q.isError ? "Errore" : "Operativo";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Panoramica piattaforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dati reali di tutti i punti vendita</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, v]) => (
          <div key={label} className="surface p-5">
            <span className="text-sm text-muted-foreground">{label}</span>
            <p className="mt-3 text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface overflow-hidden lg:col-span-2">
          <h2 className="border-b border-border px-5 py-4 text-lg">Attività recenti</h2>
          {events.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">Nessuna attività.</p>
          ) : (
            <ul className="divide-y divide-border">
              {events.map((e, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
                  <span>{e.text}</span>
                  <span className="text-muted-foreground">{fmtDate(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-6">
          <div className="surface p-5">
            <h2 className="text-lg">Stato del sistema</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["Database", ok(salons)],
                ["Autenticazione", "Operativo"],
                ["Appuntamenti", ok(appointments)],
              ].map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  {k} <Badge variant="outline">{v}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface p-5">
            <h2 className="flex items-center gap-2 text-lg">
              <Mail className="h-4 w-4" /> Monitoraggio email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Nessun sistema di invio email è ancora collegato. Quando verrà attivato, qui compariranno gli
              invii (inviata, fallita, in attesa).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
