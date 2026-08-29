import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  addMinutesToTime,
  euro,
  formatDateIt,
  hhmm,
  minutesBetween,
} from "@/lib/lookera";

export type AppointmentRow = {
  id: string;
  salon_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  price: number | string;
  status: string;
  notes: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  services?: { name: string; duration_min: number } | null;
};

export function AppointmentDialog({
  appointment,
  onOpenChange,
}: {
  appointment: AppointmentRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");

  const duration = appointment
    ? (appointment.services?.duration_min ??
      minutesBetween(appointment.start_time, appointment.end_time))
    : 0;

  const slotsQ = useQuery({
    queryKey: ["slots", appointment?.salon_id, appointment?.service_id, date],
    enabled: !!appointment && rescheduling && !!date,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_slots", {
        p_salon: appointment!.salon_id,
        p_service: appointment!.service_id,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? []) as unknown as string[];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from("appointments")
        .update(patch)
        .eq("id", appointment!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      toast.success("Appuntamento aggiornato");
      setRescheduling(false);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!appointment) return null;

  return (
    <Dialog open={!!appointment} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment.services?.name ?? "Appuntamento"}</DialogTitle>
          <DialogDescription>Dettaglio e azioni sull'appuntamento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <Row label="Cliente" value={appointment.customer_name || "—"} />
          <Row label="Email" value={appointment.customer_email || "—"} />
          <Row label="Telefono" value={appointment.customer_phone || "—"} />
          <Row label="Data" value={formatDateIt(appointment.appointment_date)} />
          <Row
            label="Orario"
            value={`${hhmm(appointment.start_time)} – ${hhmm(appointment.end_time)} (${duration} min)`}
          />
          <Row label="Prezzo" value={euro(appointment.price)} />
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Stato</span>
            <Badge variant="outline" className={STATUS_CLASSES[appointment.status]}>
              {STATUS_LABELS[appointment.status]}
            </Badge>
          </div>
          {appointment.notes && (
            <div className="rounded-lg bg-muted p-3 text-muted-foreground">
              <p className="mb-1 text-xs uppercase tracking-wide">Note private</p>
              {appointment.notes}
            </div>
          )}
        </div>

        {rescheduling ? (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="space-y-2">
              <Label htmlFor="resched-date">Nuova data</Label>
              <Input
                id="resched-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSlot("");
                }}
              />
            </div>
            {date && (
              <div className="space-y-2">
                <Label>Orario disponibile</Label>
                {slotsQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Calcolo slot…</p>
                ) : (slotsQ.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessuno slot disponibile.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(slotsQ.data ?? []).map((s) => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={slot === s ? "default" : "outline"}
                        onClick={() => setSlot(s)}
                      >
                        {hhmm(s)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                disabled={!slot || update.isPending}
                onClick={() =>
                  update.mutate({
                    appointment_date: date,
                    start_time: hhmm(slot),
                    end_time: addMinutesToTime(slot, duration),
                  })
                }
              >
                Salva nuovo orario
              </Button>
              <Button variant="ghost" onClick={() => setRescheduling(false)}>
                Annulla
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {appointment.status === "pending" && (
              <Button size="sm" onClick={() => update.mutate({ status: "confirmed" })}>
                Conferma
              </Button>
            )}
            {["pending", "confirmed"].includes(appointment.status) && (
              <>
                <Button size="sm" variant="outline" onClick={() => setRescheduling(true)}>
                  Riprogramma
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => update.mutate({ status: "completed" })}
                >
                  Completa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => update.mutate({ status: "no_show" })}
                >
                  No-show
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => update.mutate({ status: "cancelled" })}
                >
                  Annulla
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
