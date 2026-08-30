import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OwnerPage } from "@/components/owner-page";
import { NewAppointmentDialog } from "@/components/new-appointment-dialog";
import { AppointmentDialog, type AppointmentRow } from "@/components/appointment-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_CLASSES, STATUS_LABELS, euro, hhmm, toDateKey } from "@/lib/lookera";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  component: CalendarRoute,
});

type View = "day" | "week" | "month";

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday first
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function CalendarRoute() {
  return (
    <OwnerPage title="Calendario" subtitle="Vista giorno, settimana e mese">
      {(salon) => <CalendarContent salonId={salon.id} />}
    </OwnerPage>
  );
}

function CalendarContent({ salonId }: { salonId: string }) {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<AppointmentRow | null>(null);

  const range = useMemo(() => {
    if (view === "day") return { from: toDateKey(cursor), to: toDateKey(cursor), days: [cursor] };
    if (view === "week") {
      const start = startOfWeek(cursor);
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      return { from: toDateKey(start), to: toDateKey(addDays(start, 6)), days };
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const gridStart = startOfWeek(first);
    const cells = Math.ceil((last.getTime() - gridStart.getTime()) / 86400000) + 1;
    const days = Array.from({ length: Math.ceil(cells / 7) * 7 }, (_, i) => addDays(gridStart, i));
    return {
      from: toDateKey(gridStart),
      to: toDateKey(days[days.length - 1] ?? last),
      days,
    };
  }, [view, cursor]);

  const { data } = useQuery({
    queryKey: ["appointments", salonId, range.from, range.to],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("appointments")
        .select("*, services(name,duration_min)")
        .eq("salon_id", salonId)
        .gte("appointment_date", range.from)
        .lte("appointment_date", range.to)
        .order("start_time");
      if (error) throw error;
      return (rows ?? []) as unknown as AppointmentRow[];
    },
  });

  const byDate = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const a of data ?? []) {
      const list = map.get(a.appointment_date) ?? [];
      list.push(a);
      map.set(a.appointment_date, list);
    }
    return map;
  }, [data]);

  function shift(dir: number) {
    if (view === "day") setCursor((c) => addDays(c, dir));
    else if (view === "week") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  const label =
    view === "month"
      ? cursor.toLocaleDateString("it-IT", { month: "long", year: "numeric" })
      : view === "day"
        ? cursor.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })
        : `${range.days[0]?.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} – ${range.days[6]?.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Precedente">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Successivo">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Oggi
          </Button>
          <span className="ml-2 text-sm font-medium capitalize">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border p-1">
            {(
              [
                ["day", "Giorno"],
                ["week", "Settimana"],
                ["month", "Mese"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <NewAppointmentDialog salonId={salonId} />
        </div>
      </div>

      {view === "month" ? (
        <div className="surface overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-center text-xs text-muted-foreground">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {range.days.map((d) => {
              const key = toDateKey(d);
              const items = byDate.get(key) ?? [];
              const otherMonth = d.getMonth() !== cursor.getMonth();
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-24 border-b border-r border-border p-1.5",
                    otherMonth && "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <div className="text-xs">{d.getDate()}</div>
                  <div className="mt-1 space-y-1">
                    {items.slice(0, 3).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelected(a)}
                        className={cn(
                          "block w-full truncate rounded border px-1 py-0.5 text-left text-[11px]",
                          STATUS_CLASSES[a.status],
                        )}
                      >
                        {hhmm(a.start_time)} {a.customer_name || a.services?.name}
                      </button>
                    ))}
                    {items.length > 3 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{items.length - 3} altri
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            view === "week" ? "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" : "grid-cols-1",
          )}
        >
          {range.days.map((d) => {
            const key = toDateKey(d);
            const items = byDate.get(key) ?? [];
            return (
              <div key={key} className="surface p-4">
                <p className="text-sm font-medium capitalize">
                  {d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <div className="mt-3 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nessun appuntamento</p>
                  ) : (
                    items.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelected(a)}
                        className="w-full rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {hhmm(a.start_time)}–{hhmm(a.end_time)}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", STATUS_CLASSES[a.status])}
                          >
                            {STATUS_LABELS[a.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm">{a.customer_name || "Cliente"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.services?.name} · {euro(a.price)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AppointmentDialog appointment={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
