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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMinutesToTime, euro, hhmm, toDateKey } from "@/lib/lookera";
import { Plus } from "lucide-react";

type Service = { id: string; name: string; price: number | string; duration_min: number };

export function NewAppointmentDialog({ salonId }: { salonId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [slot, setSlot] = useState("");

  const servicesQ = useQuery({
    queryKey: ["services", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,price,duration_min")
        .eq("salon_id", salonId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });

  const slotsQ = useQuery({
    queryKey: ["slots", salonId, serviceId, date],
    enabled: !!serviceId && !!date,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_slots", {
        p_salon: salonId,
        p_service: serviceId,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? []) as unknown as string[];
    },
  });

  const service = servicesQ.data?.find((s) => s.id === serviceId);

  const create = useMutation({
    mutationFn: async (form: { name: string; email: string; phone: string; notes: string }) => {
      if (!service || !slot) throw new Error("Seleziona servizio e orario");
      const { error } = await supabase.from("appointments").insert({
        salon_id: salonId,
        service_id: service.id,
        appointment_date: date,
        start_time: hhmm(slot),
        end_time: addMinutesToTime(slot, service.duration_min),
        price: Number(service.price),
        status: "confirmed",
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Appuntamento creato");
      setOpen(false);
      setSlot("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    if (name.length < 2) {
      toast.error("Inserisci il nome del cliente");
      return;
    }
    create.mutate({
      name,
      email: String(f.get("email") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      notes: String(f.get("notes") ?? "").trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Nuovo appuntamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo appuntamento</DialogTitle>
          <DialogDescription>Inserisci una prenotazione ricevuta al telefono.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Servizio</Label>
            <Select
              value={serviceId}
              onValueChange={(v) => {
                setServiceId(v);
                setSlot("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Scegli un servizio" />
              </SelectTrigger>
              <SelectContent>
                {(servicesQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {euro(s.price)} · {s.duration_min} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="na-date">Data</Label>
            <Input
              id="na-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSlot("");
              }}
            />
          </div>
          {serviceId && (
            <div className="space-y-2">
              <Label>Orario</Label>
              {slotsQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Calcolo slot…</p>
              ) : (slotsQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuno slot libero in questa data.</p>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="na-name">Nome cliente *</Label>
              <Input id="na-name" name="name" required maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="na-phone">Telefono</Label>
              <Input id="na-phone" name="phone" maxLength={30} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="na-email">Email</Label>
            <Input id="na-email" name="email" type="email" maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="na-notes">Note private</Label>
            <Textarea id="na-notes" name="notes" rows={2} maxLength={500} />
          </div>
          <Button type="submit" className="w-full" disabled={!slot || create.isPending}>
            Crea appuntamento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
