import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OwnerPage, type Salon } from "@/components/owner-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAYS, hhmm } from "@/lib/lookera";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orari")({
  component: HoursRoute,
});

type HourRow = {
  id?: string;
  salon_id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
};

function HoursRoute() {
  return (
    <OwnerPage title="Orari e disponibilità" subtitle="Apertura, pause, chiusure e blocchi">
      {(salon) => <HoursContent salon={salon} />}
    </OwnerPage>
  );
}

function HoursContent({ salon }: { salon: Salon }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<HourRow[]>([]);

  const hoursQ = useQuery({
    queryKey: ["hours", salon.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_hours")
        .select("*")
        .eq("salon_id", salon.id)
        .order("day_of_week");
      if (error) throw error;
      return (data ?? []) as HourRow[];
    },
  });

  useEffect(() => {
    if (!hoursQ.data) return;
    const map = new Map(hoursQ.data.map((r) => [r.day_of_week, r]));
    setRows(
      WEEKDAYS.map((_, i) => {
        const found = map.get(i);
        return (
          found ?? {
            salon_id: salon.id,
            day_of_week: i,
            is_closed: true,
            open_time: "09:00:00",
            close_time: "18:00:00",
            break_start: null,
            break_end: null,
          }
        );
      }),
    );
  }, [hoursQ.data, salon.id]);

  const saveHours = useMutation({
    mutationFn: async () => {
      for (const r of rows) {
        const payload = {
          salon_id: salon.id,
          day_of_week: r.day_of_week,
          is_closed: r.is_closed,
          open_time: hhmm(r.open_time),
          close_time: hhmm(r.close_time),
          break_start: r.break_start ? hhmm(r.break_start) : null,
          break_end: r.break_end ? hhmm(r.break_end) : null,
        };
        if (r.id) {
          const { error } = await supabase.from("business_hours").update(payload).eq("id", r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("business_hours").insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hours"] });
      toast.success("Orari salvati");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const blockedQ = useQuery({
    queryKey: ["blocked", salon.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_slots")
        .select("*")
        .eq("salon_id", salon.id)
        .order("slot_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addBlock = useMutation({
    mutationFn: async (b: { slot_date: string; start_time: string; end_time: string; reason: string }) => {
      const { error } = await supabase.from("blocked_slots").insert({
        salon_id: salon.id,
        slot_date: b.slot_date,
        start_time: b.start_time,
        end_time: b.end_time,
        reason: b.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocked"] });
      toast.success("Fascia bloccata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocked"] }),
  });

  const saveSalon = useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      address: string;
      phone: string;
      email: string;
      image_url: string;
      cancellation_hours: number;
    }) => {
      const { error } = await supabase
        .from("salons")
        .update({
          name: input.name,
          description: input.description || null,
          address: input.address || null,
          phone: input.phone || null,
          email: input.email || null,
          image_url: input.image_url || null,
          cancellation_hours: input.cancellation_hours,
        })
        .eq("id", salon.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-salon"] });
      toast.success("Informazioni salone aggiornate");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <section className="surface p-6">
        <h2 className="text-lg">Informazioni salone</h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            saveSalon.mutate({
              name: String(f.get("name") ?? "").trim(),
              description: String(f.get("description") ?? "").trim(),
              address: String(f.get("address") ?? "").trim(),
              phone: String(f.get("phone") ?? "").trim(),
              email: String(f.get("email") ?? "").trim(),
              image_url: String(f.get("image_url") ?? "").trim(),
              cancellation_hours: Number(f.get("cancellation_hours") ?? 24),
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="s-name">Nome</Label>
            <Input id="s-name" name="name" defaultValue={salon.name} required maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-address">Indirizzo</Label>
            <Input id="s-address" name="address" defaultValue={salon.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-phone">Telefono</Label>
            <Input id="s-phone" name="phone" defaultValue={salon.phone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" name="email" type="email" defaultValue={salon.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-image">URL foto/logo</Label>
            <Input id="s-image" name="image_url" defaultValue={salon.image_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-cancel">Ore minime per annullare</Label>
            <Input
              id="s-cancel"
              name="cancellation_hours"
              type="number"
              min="0"
              max="168"
              defaultValue={salon.cancellation_hours}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="s-desc">Descrizione</Label>
            <Textarea id="s-desc" name="description" rows={3} defaultValue={salon.description ?? ""} />
          </div>
          <Button type="submit" className="sm:col-span-2" disabled={saveSalon.isPending}>
            Salva informazioni
          </Button>
        </form>
      </section>

      <section className="surface p-6">
        <h2 className="text-lg">Orari di apertura</h2>
        <div className="mt-4 space-y-3">
          {rows.map((r, i) => (
            <div key={r.day_of_week} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{WEEKDAYS[r.day_of_week]}</span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Aperto
                  <Switch
                    checked={!r.is_closed}
                    onCheckedChange={(v) =>
                      setRows((p) => p.map((x, xi) => (xi === i ? { ...x, is_closed: !v } : x)))
                    }
                  />
                </label>
              </div>
              {!r.is_closed && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input
                    type="time"
                    value={hhmm(r.open_time)}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x, xi) => (xi === i ? { ...x, open_time: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    type="time"
                    value={hhmm(r.close_time)}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x, xi) => (xi === i ? { ...x, close_time: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    type="time"
                    value={hhmm(r.break_start ?? "")}
                    disabled={!r.break_start}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x, xi) => (xi === i ? { ...x, break_start: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    type="time"
                    value={hhmm(r.break_end ?? "")}
                    disabled={!r.break_start}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x, xi) => (xi === i ? { ...x, break_end: e.target.value } : x)),
                      )
                    }
                  />
                  <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground sm:col-span-4">
                    <Checkbox
                      checked={!!r.break_start}
                      onCheckedChange={(v) =>
                        setRows((p) =>
                          p.map((x, xi) =>
                            xi === i
                              ? v === true
                                ? { ...x, break_start: "13:00", break_end: "14:00" }
                                : { ...x, break_start: null, break_end: null }
                              : x,
                          ),
                        )
                      }
                    />
                    Pausa
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
        <Button className="mt-5" onClick={() => saveHours.mutate()} disabled={saveHours.isPending}>
          Salva orari
        </Button>
      </section>

      <section className="surface p-6">
        <h2 className="text-lg">Fasce bloccate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Blocca orari per ferie, corsi o impegni personali.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            addBlock.mutate({
              slot_date: String(f.get("slot_date") ?? ""),
              start_time: String(f.get("start_time") ?? ""),
              end_time: String(f.get("end_time") ?? ""),
              reason: String(f.get("reason") ?? ""),
            });
            e.currentTarget.reset();
          }}
        >
          <Input type="date" name="slot_date" required />
          <Input type="time" name="start_time" required />
          <Input type="time" name="end_time" required />
          <Input name="reason" placeholder="Motivo" maxLength={80} />
          <Button type="submit" disabled={addBlock.isPending}>
            Blocca
          </Button>
        </form>
        <ul className="mt-4 divide-y divide-border">
          {(blockedQ.data ?? []).map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {b.slot_date} · {hhmm(b.start_time)}–{hhmm(b.end_time)}
                {b.reason ? ` · ${b.reason}` : ""}
              </span>
              <Button size="sm" variant="ghost" onClick={() => removeBlock.mutate(b.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {(blockedQ.data ?? []).length === 0 && (
            <li className="py-2 text-sm text-muted-foreground">Nessuna fascia bloccata.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
