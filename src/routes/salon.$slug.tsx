import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, MapPin, Phone, Star, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { WEEKDAYS, addMinutesToTime, euro, formatDateIt, hhmm, toDateKey } from "@/lib/lookera";
import salonDefault from "@/assets/salon-default.jpg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salon/$slug")({
  head: () => ({
    meta: [
      { title: "Prenota online — LookEra" },
      {
        name: "description",
        content:
          "Scegli il servizio, il giorno e l'orario e prenota il tuo appuntamento in pochi secondi.",
      },
      { property: "og:title", content: "Prenota online — LookEra" },
      {
        property: "og:description",
        content: "Prenotazione online per saloni di parrucchieri, barbieri e centri estetici.",
      },
    ],
  }),
  component: PublicSalonPage,
});

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  duration_min: number;
};

function PublicSalonPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useSession();

  const salonQ = useQuery({
    queryKey: ["public-salon", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const salon = salonQ.data;

  const servicesQ = useQuery({
    queryKey: ["public-services", salon?.id],
    enabled: !!salon?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,description,price,duration_min")
        .eq("salon_id", salon!.id)
        .eq("is_active", true)
        .order("price");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });

  const hoursQ = useQuery({
    queryKey: ["public-hours", salon?.id],
    enabled: !!salon?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_hours")
        .select("*")
        .eq("salon_id", salon!.id)
        .order("day_of_week");
      if (error) throw error;
      return data ?? [];
    },
  });

  const reviewsQ = useQuery({
    queryKey: ["public-reviews", salon?.id],
    enabled: !!salon?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,author_name,rating,comment,created_at")
        .eq("salon_id", salon!.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slotsQ = useQuery({
    queryKey: ["public-slots", salon?.id, service?.id, date],
    enabled: !!salon?.id && !!service?.id && !!date,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_slots", {
        p_salon: salon!.id,
        p_service: service!.id,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? []) as unknown as string[];
    },
  });

  const ratings = reviewsQ.data ?? [];
  const avg = ratings.length
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : null;

  if (salonQ.isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  }
  if (!salon) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl">Salone non trovato</h1>
        <Link to="/" className="text-primary underline">
          Torna alla home
        </Link>
      </div>
    );
  }

  async function submitBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      toast.error("Accedi per confermare la prenotazione");
      navigate({ to: "/auth" });
      return;
    }
    if (!service || !date || !slot) return;
    const f = new FormData(e.currentTarget);
    setSubmitting(true);
    const { error } = await supabase.from("appointments").insert({
      salon_id: salon!.id,
      client_id: user.id,
      service_id: service.id,
      appointment_date: date,
      start_time: hhmm(slot),
      end_time: addMinutesToTime(slot, service.duration_min),
      status: "pending" as const,
      customer_name: String(f.get("name") ?? "").trim(),
      customer_email: String(f.get("email") ?? "").trim(),
      customer_phone: String(f.get("phone") ?? "").trim() || null,
      notes: String(f.get("notes") ?? "").trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Prenotazione inviata! Riceverai conferma dal salone.");
    navigate({ to: "/prenotazioni" });
  }

  const today = toDateKey(new Date());

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> LookEra
          </Link>
          {user ? (
            <Link to="/prenotazioni" className="text-sm text-primary">
              Le mie prenotazioni
            </Link>
          ) : (
            <Link to="/auth" className="text-sm text-primary">
              Accedi
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4">
        <div className="mt-6 overflow-hidden rounded-2xl">
          <img
            src={salon.image_url || salonDefault}
            alt={`Interno di ${salon.name}`}
            className="h-48 w-full object-cover sm:h-64"
          />
        </div>

        <div className="mt-6">
          <h1 className="text-3xl">{salon.name}</h1>
          {avg !== null && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-current text-primary" />
              <span className="font-medium">{avg.toFixed(1)}</span>
              <span className="text-muted-foreground">({ratings.length} recensioni)</span>
            </div>
          )}
          {salon.description && (
            <p className="mt-3 text-muted-foreground">{salon.description}</p>
          )}
          <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
            {salon.address && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {salon.address}
              </span>
            )}
            {salon.phone && (
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {salon.phone}
              </span>
            )}
          </div>
        </div>

        <section className="surface mt-8 p-5">
          <h2 className="flex items-center gap-2 text-lg">
            <Clock className="h-4 w-4" /> Orari
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(hoursQ.data ?? []).map((h) => (
              <li key={h.id} className="flex justify-between">
                <span>{WEEKDAYS[h.day_of_week]}</span>
                <span className="text-muted-foreground">
                  {h.is_closed
                    ? "Chiuso"
                    : `${hhmm(h.open_time)}–${hhmm(h.close_time)}${
                        h.break_start ? ` (pausa ${hhmm(h.break_start)}–${hhmm(h.break_end)})` : ""
                      }`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8" id="prenota">
          <h2 className="text-2xl">Prenota</h2>

          <div className="surface mt-4 p-5">
            <p className="text-sm font-medium">1. Scegli il servizio</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(servicesQ.data ?? []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setService(s);
                    setSlot("");
                  }}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    service?.id === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-sm">{euro(s.price)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.duration_min} min{s.description ? ` · ${s.description}` : ""}
                  </p>
                </button>
              ))}
              {(servicesQ.data ?? []).length === 0 && !servicesQ.isLoading && (
                <p className="text-sm text-muted-foreground">Nessun servizio disponibile.</p>
              )}
            </div>
          </div>

          {service && (
            <div className="surface mt-4 p-5">
              <p className="text-sm font-medium">2. Scegli il giorno</p>
              <Input
                type="date"
                className="mt-3 max-w-xs"
                min={today}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSlot("");
                }}
              />
            </div>
          )}

          {service && date && (
            <div className="surface mt-4 p-5">
              <p className="text-sm font-medium">3. Scegli l'orario</p>
              <div className="mt-3">
                {slotsQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Calcolo disponibilità…</p>
                ) : (slotsQ.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nessun orario disponibile in questa data.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(slotsQ.data ?? []).map((s) => (
                      <Button
                        key={s}
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
            </div>
          )}

          {service && date && slot && (
            <form onSubmit={submitBooking} className="surface mt-4 space-y-4 p-5">
              <p className="text-sm font-medium">4. I tuoi dati</p>
              <p className="text-sm text-muted-foreground">
                {service.name} · {formatDateIt(date)} · {hhmm(slot)} · {euro(service.price)}
              </p>
              {!user && (
                <p className="rounded-lg bg-muted p-3 text-sm">
                  Per confermare devi{" "}
                  <Link to="/auth" className="text-primary underline">
                    accedere o creare un account
                  </Link>
                  .
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="b-name">Nome e cognome</Label>
                  <Input id="b-name" name="name" required maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-email">Email</Label>
                  <Input
                    id="b-email"
                    name="email"
                    type="email"
                    required
                    defaultValue={user?.email ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-phone">Telefono</Label>
                  <Input id="b-phone" name="phone" maxLength={30} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="b-notes">Note (facoltative)</Label>
                  <Textarea id="b-notes" name="notes" rows={2} maxLength={300} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !user}>
                Conferma prenotazione
              </Button>
            </form>
          )}
        </section>

        {ratings.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl">Recensioni</h2>
            <div className="mt-4 space-y-3">
              {ratings.map((r) => (
                <div key={r.id} className="surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.author_name || "Cliente"}</span>
                    <Badge variant="outline">{r.rating}/5</Badge>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
