import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Euro, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OwnerPage } from "@/components/owner-page";
import { NewAppointmentDialog } from "@/components/new-appointment-dialog";
import { AppointmentDialog, type AppointmentRow } from "@/components/appointment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_CLASSES, STATUS_LABELS, euro, hhmm, minutesBetween, toDateKey } from "@/lib/lookera";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <OwnerPage title="Dashboard" subtitle="Uno sguardo veloce alla giornata">
      {(salon) => <DashboardContent salonId={salon.id} slug={salon.slug} />}
    </OwnerPage>
  );
}

function DashboardContent({ salonId, slug }: { salonId: string; slug: string }) {
  const today = toDateKey(new Date());
  const [selected, setSelected] = useState<AppointmentRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", salonId, "dashboard", today],
    queryFn: async () => {
      const { data: appts, error } = await supabase
        .from("appointments")
        .select("*, services(name,duration_min)")
        .eq("salon_id", salonId)
        .gte("appointment_date", today)
        .order("appointment_date")
        .order("start_time");
      if (error) throw error;
      return (appts ?? []) as unknown as AppointmentRow[];
    },
  });

  const all = data ?? [];
  const active = all.filter((a) => ["pending", "confirmed"].includes(a.status));
  const todays = active.filter((a) => a.appointment_date === today);
  const upcoming = active.filter((a) => a.appointment_date > today);
  const revenue = todays.reduce((sum, a) => sum + Number(a.price), 0);

  const clientsQ = useQuery({
    queryKey: ["clients-count", salonId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("appointments")
        .select("customer_email, customer_name")
        .eq("salon_id", salonId);
      if (error) throw error;
      const keys = new Set(
        (rows ?? []).map((r) => (r.customer_email || r.customer_name || "").toLowerCase()),
      );
      keys.delete("");
      return keys.size;
    },
  });

  const stats = [
    { label: "Appuntamenti oggi", value: String(todays.length), icon: CalendarDays },
    { label: "Prossimi appuntamenti", value: String(upcoming.length), icon: Clock },
    { label: "Incasso previsto oggi", value: euro(revenue), icon: Euro },
    { label: "Clienti totali", value: String(clientsQ.data ?? 0), icon: Users },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <NewAppointmentDialog salonId={salonId} />
        <Button asChild variant="outline" size="sm">
          <Link to="/salon/$slug" params={{ slug }} target="_blank">
            Vedi pagina pubblica
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg">Appuntamenti di oggi</h2>
        </div>
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Caricamento…</p>
        ) : todays.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            Nessun appuntamento in programma oggi.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {todays.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => setSelected(a)}
                  className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="w-16 font-medium">{hhmm(a.start_time)}</span>
                  <span className="min-w-32 flex-1">
                    <span className="block font-medium">{a.customer_name || "Cliente"}</span>
                    <span className="block text-sm text-muted-foreground">
                      {a.services?.name} ·{" "}
                      {a.services?.duration_min ?? minutesBetween(a.start_time, a.end_time)} min
                    </span>
                  </span>
                  <span className="text-sm font-medium">{euro(a.price)}</span>
                  <Badge variant="outline" className={STATUS_CLASSES[a.status]}>
                    {STATUS_LABELS[a.status]}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AppointmentDialog appointment={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
