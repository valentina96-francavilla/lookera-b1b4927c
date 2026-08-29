import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMySalon, useRole, useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { DEFAULT_SERVICES, WEEKDAYS, euro, slugify } from "@/lib/lookera";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const salonSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il nome del salone").max(80),
  description: z.string().trim().max(600).optional(),
  address: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(255).optional(),
  image_url: z.string().trim().max(500).optional(),
});

type DayRow = {
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
  has_break: boolean;
};

const defaultDays = (): DayRow[] =>
  WEEKDAYS.map((_, i) => ({
    day_of_week: i,
    is_closed: i === 0 || i === 1,
    open_time: "09:00",
    close_time: "18:00",
    break_start: "13:00",
    break_end: "14:00",
    has_break: i !== 0 && i !== 1,
  }));

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useSession();
  const roleQ = useRole(user?.id);
  const salonQ = useMySalon(user?.id);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [days, setDays] = useState<DayRow[]>(defaultDays);
  const [picked, setPicked] = useState<string[]>(
    DEFAULT_SERVICES.slice(0, 4).map((s) => s.name),
  );

  useEffect(() => {
    if (loading || roleQ.isLoading || salonQ.isLoading) return;
    if (roleQ.data === "client") navigate({ to: "/prenotazioni" });
    else if (salonQ.data) navigate({ to: "/dashboard" });
  }, [loading, roleQ.isLoading, roleQ.data, salonQ.isLoading, salonQ.data, navigate]);

  async function createSalon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = salonSchema.safeParse({
      name: String(f.get("name") ?? ""),
      description: String(f.get("description") ?? ""),
      address: String(f.get("address") ?? ""),
      phone: String(f.get("phone") ?? ""),
      email: String(f.get("email") ?? ""),
      image_url: String(f.get("image_url") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    setSaving(true);
    const base = slugify(parsed.data.name) || "salone";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("salons")
      .insert({
        owner_id: user!.id,
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        image_url: parsed.data.image_url || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSalonId(data.id);
    setStep(2);
  }

  async function saveHours() {
    if (!salonId) return;
    setSaving(true);
    const rows = days.map((d) => ({
      salon_id: salonId,
      day_of_week: d.day_of_week,
      is_closed: d.is_closed,
      open_time: d.open_time,
      close_time: d.close_time,
      break_start: d.has_break && !d.is_closed ? d.break_start : null,
      break_end: d.has_break && !d.is_closed ? d.break_end : null,
    }));
    const { error } = await supabase.from("business_hours").insert(rows);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep(3);
  }

  async function saveServices() {
    if (!salonId) return;
    const rows = DEFAULT_SERVICES.filter((s) => picked.includes(s.name)).map((s) => ({
      salon_id: salonId,
      name: s.name,
      price: s.price,
      duration_min: s.duration_min,
      is_active: true,
    }));
    setSaving(true);
    if (rows.length) {
      const { error } = await supabase.from("services").insert(rows);
      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
    }
    await qc.invalidateQueries({ queryKey: ["my-salon"] });
    setSaving(false);
    toast.success("Salone configurato!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <p className="font-display text-xl font-semibold">
          Look<span className="text-primary">Era</span>
        </p>
        <div className="mt-6 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                step >= n ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="surface mt-6 p-6 sm:p-8">
            <h1 className="text-2xl">Crea il tuo salone</h1>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">
              Queste informazioni compaiono sulla tua pagina pubblica.
            </p>
            <form onSubmit={createSalon} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome salone *</Label>
                <Input id="name" name="name" required maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea id="description" name="description" rows={3} maxLength={600} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Indirizzo</Label>
                  <Input id="address" name="address" maxLength={160} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input id="phone" name="phone" maxLength={30} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image_url">URL foto/logo</Label>
                  <Input id="image_url" name="image_url" placeholder="https://…" maxLength={500} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                Continua
              </Button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="surface mt-6 p-6 sm:p-8">
            <h1 className="text-2xl">Orari di apertura</h1>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">
              Imposta apertura, chiusura e pausa per ogni giorno.
            </p>
            <div className="space-y-3">
              {days.map((d, i) => (
                <div key={d.day_of_week} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{WEEKDAYS[d.day_of_week]}</span>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Aperto
                      <Switch
                        checked={!d.is_closed}
                        onCheckedChange={(v) =>
                          setDays((prev) =>
                            prev.map((x, xi) => (xi === i ? { ...x, is_closed: !v } : x)),
                          )
                        }
                      />
                    </label>
                  </div>
                  {!d.is_closed && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Input
                        type="time"
                        value={d.open_time}
                        onChange={(e) =>
                          setDays((p) =>
                            p.map((x, xi) => (xi === i ? { ...x, open_time: e.target.value } : x)),
                          )
                        }
                      />
                      <Input
                        type="time"
                        value={d.close_time}
                        onChange={(e) =>
                          setDays((p) =>
                            p.map((x, xi) => (xi === i ? { ...x, close_time: e.target.value } : x)),
                          )
                        }
                      />
                      <Input
                        type="time"
                        value={d.break_start}
                        disabled={!d.has_break}
                        onChange={(e) =>
                          setDays((p) =>
                            p.map((x, xi) => (xi === i ? { ...x, break_start: e.target.value } : x)),
                          )
                        }
                      />
                      <Input
                        type="time"
                        value={d.break_end}
                        disabled={!d.has_break}
                        onChange={(e) =>
                          setDays((p) =>
                            p.map((x, xi) => (xi === i ? { ...x, break_end: e.target.value } : x)),
                          )
                        }
                      />
                      <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground sm:col-span-4">
                        <Checkbox
                          checked={d.has_break}
                          onCheckedChange={(v) =>
                            setDays((p) =>
                              p.map((x, xi) => (xi === i ? { ...x, has_break: v === true } : x)),
                            )
                          }
                        />
                        Pausa pranzo
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={saveHours} className="mt-6 w-full" disabled={saving}>
              Continua
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="surface mt-6 p-6 sm:p-8">
            <h1 className="text-2xl">I tuoi primi servizi</h1>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">
              Scegli quelli che offri: potrai modificarli in qualsiasi momento.
            </p>
            <div className="space-y-2">
              {DEFAULT_SERVICES.map((s) => {
                const active = picked.includes(s.name);
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() =>
                      setPicked((p) =>
                        p.includes(s.name) ? p.filter((x) => x !== s.name) : [...p, s.name],
                      )
                    }
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                      active ? "border-primary bg-accent" : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="flex items-center gap-3 text-sm text-muted-foreground">
                      {euro(s.price)} · {s.duration_min} min
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button onClick={saveServices} className="mt-6 w-full" disabled={saving}>
              Completa configurazione
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
