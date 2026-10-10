import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, MapPin, Phone, Star, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole, useSession } from "@/hooks/use-auth";
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
  const { user } = useSession();
  const roleQ = useRole(user?.id);

  const salonQ = useQuery({
    queryKey: ["public-salon", slug],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .eq("slug", slug)
        .limit(1)
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
    enabled: !!salon?.id && salon?.plan === "professional",
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
  const [isDemo, setIsDemo] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    setIsDemo(new URLSearchParams(window.location.search).get("demo") === "1");
  }, []);

  useEffect(() => {
    if (isDemo) return;
    const raw = localStorage.getItem("lookera-booking-draft");
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { slug?: string; serviceId?: string; date?: string; slot?: string };
      if (draft.slug !== slug) return;
      if (draft.date) setDate(draft.date);
      if (draft.slot) setSlot(draft.slot);
      const savedService = (servicesQ.data ?? []).find((item) => item.id === draft.serviceId);
      if (savedService) {
        setService(savedService);
        localStorage.removeItem("lookera-booking-draft");
      }
    } catch {
      localStorage.removeItem("lookera-booking-draft");
    }
  }, [slug, servicesQ.data, isDemo]);

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
  if (salonQ.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl">Non è stato possibile caricare il salone</h1>
        <p className="max-w-md text-sm text-muted-foreground">Ricarica la pagina e riprova.</p>
        <button type="button" onClick={() => void salonQ.refetch()} className="text-primary underline">Riprova</button>
        <Link to="/index2" className="text-sm text-muted-foreground underline">Torna alla home</Link>
      </div>
    );
  }
  if (!salon) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl">Salone non trovato</h1>
        <Link to="/index2" className="text-primary underline">
          Torna alla home
        </Link>
      </div>
    );
  }

  function continueToAuth() {
    if (isDemo || !service || !date || !slot) return;
    localStorage.setItem("lookera-booking-draft", JSON.stringify({ slug, serviceId: service.id, date, slot }));
    window.location.href = `/auth?returnTo=${encodeURIComponent(`/salon/${slug}`)}`;
  }

  async function submitBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!service || !date || !slot || !salon) return;

    if (isDemo) {
      setSubmitting(true);
      window.setTimeout(() => {
        setSubmitting(false);
        toast.success("Demo completata! Nessun profilo o appuntamento è stato creato.");
      }, 500);
      return;
    }

    if (!user) return;

    const form = new FormData(e.currentTarget);
    const customerName = String(form.get("name") ?? "").trim();
    const customerEmail = String(form.get("email") ?? "").trim();
    const customerPhone = String(form.get("phone") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();

    setSubmitting(true);
    try {
      const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
          salon_id: salon.id,
          client_id: user.id,
          service_id: service.id,
          appointment_date: date,
          start_time: hhmm(slot),
          end_time: addMinutesToTime(slot, service.duration_min),
          status: "pending",
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          notes,
        })
        .select("id")
        .single();

      if (error) throw error;

      const { error: emailError } = await supabase.functions.invoke(
        "send-appointment-email",
        {
          body: {
            appointment_id: appointment.id,
            event: "requested",
          },
        },
      );

      localStorage.removeItem("lookera-booking-draft");

      if (emailError) {
        console.error("Errore invio email appuntamento:", emailError);
        toast.warning(
          "Prenotazione ricevuta, ma non è stato possibile inviare le email di notifica.",
        );
      } else {
        toast.success("Prenotazione inviata! Controlla la tua email.");
      }

      window.location.href = "/prenotazioni";
    } catch (error: any) {
      toast.error(error?.message ?? "Non è stato possibile creare la prenotazione. Riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  const availableDays = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Always start from Monday of the current week, so the calendar
    // is consistently displayed Monday → Sunday.
    const monday = new Date(today);
    const dayOfWeek = monday.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(monday.getDate() - daysFromMonday);

    // 9 complete weeks = Monday → Sunday throughout the calendar.
    return Array.from({ length: 63 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = toDateKey(d);
      const hours = (hoursQ.data ?? []).find((h) => h.day_of_week === d.getDay());
      const past = d < today;
      return { date: d, key, closed: past || !hours || hours.is_closed };
    });
  })();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/index2";
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/index2" className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> LookEra
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to={roleQ.data === "owner" ? "/dashboard" : roleQ.data === "super_admin" ? "/super-admin" : "/prenota"}
                className="text-sm text-primary"
              >
                {roleQ.data === "owner" ? "Profilo negozio" : roleQ.data === "super_admin" ? "Super Admin" : "Prenota appuntamento"}
              </Link>
              <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground">
                Esci
              </button>
            </div>
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
            {(salon.address || salon.city || salon.province) && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [salon.address, salon.city, salon.province].filter(Boolean).join(", "),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span>
                  {[salon.address, salon.city, salon.province].filter(Boolean).join(", ")}
                </span>
              </a>
            )}
            {salon.phone && (
              <a
                href={`tel:${salon.phone}`}
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span>{salon.phone}</span>
              </a>
            )}
          </div>
        </div>

        <details className="surface mt-8 overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Clock className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Orari di apertura</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {(() => {
                  const today = (hoursQ.data ?? []).find((h) => h.day_of_week === new Date().getDay());
                  return today && !today.is_closed
                    ? `Oggi ${hhmm(today.open_time)}–${hhmm(today.close_time)}`
                    : "Consulta gli orari della settimana";
                })()}
              </span>
            </span>
            <span className="text-sm text-primary">Vedi tutti</span>
            <span className="text-muted-foreground">⌄</span>
          </summary>
          <div className="border-t border-border px-5 py-4">
            <ul className="space-y-3 text-sm">
              {(hoursQ.data ?? []).slice().sort((a, b) => ((a.day_of_week + 6) % 7) - ((b.day_of_week + 6) % 7)).map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-4">
                  <span className="font-medium">{WEEKDAYS[h.day_of_week]}</span>
                  <span className="text-right text-muted-foreground">
                    {h.is_closed
                      ? "Chiuso"
                      : <>{hhmm(h.open_time)}–{hhmm(h.close_time)}{h.break_start ? <span className="block text-xs">Pausa {hhmm(h.break_start)}–{hhmm(h.break_end)}</span> : null}</>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <section className="surface mt-8 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">LookEra · Prenotazione online</p>
            <h2 className="mt-2 font-display text-2xl">Vuoi prenotare da noi?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Bastano tre semplici passaggi:</p>
            <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <li><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold">1</span>Scegli il servizio</li>
              <li><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold">2</span>Scegli il giorno</li>
              <li><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold">3</span>Conferma i tuoi dati</li>
            </ol>
          </div>
          <Button size="lg" className="shrink-0 rounded-xl px-7" onClick={() => setBookingOpen(true)}>Prenota ora <span className="ml-2">→</span></Button>
        </section>

        {bookingOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) setBookingOpen(false); }}>
            <section className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-border bg-background p-4 shadow-2xl sm:rounded-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="booking-title">
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Prenotazione online</p><h2 id="booking-title" className="mt-1 font-display text-2xl">Prenota da {salon.name}</h2><p className="mt-1 text-sm text-muted-foreground">Scegli servizio, data e orario. Poi conferma i tuoi dati.</p></div>
                <Button variant="ghost" size="icon" aria-label="Chiudi prenotazione" onClick={() => setBookingOpen(false)}>×</Button>
              </div>

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
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
                {availableDays.map(({ date: day, key, closed }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={closed}
                    onClick={() => {
                      setDate(key);
                      setSlot("");
                    }}
                    className={cn(
                      "rounded-xl border px-2 py-3 text-center text-sm transition-colors",
                      closed
                        ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground/50"
                        : date === key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted",
                    )}
                    aria-label={closed ? `${formatDateIt(key)} non disponibile` : `Seleziona ${formatDateIt(key)}`}
                  >
                    <span className="block font-medium">{day.toLocaleDateString("it-IT", { weekday: "short" })}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{day.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</span>
                  </button>
                ))}
              </div>
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

          {service && date && slot && !user && !isDemo && (
            <div className="surface mt-4 space-y-4 p-5">
              <p className="text-sm font-medium">4. Accedi per prenotare</p>
              <p className="text-sm text-muted-foreground">
                {service.name} · {formatDateIt(date)} · {hhmm(slot)} · {euro(service.price)}
              </p>
              <p className="text-sm text-muted-foreground">
                Hai scelto il tuo appuntamento. Accedi o registrati per inviare la richiesta al salone.
              </p>
              <Button type="button" className="w-full" onClick={continueToAuth}>
                Accedi o registrati
              </Button>
            </div>
          )}

          {service && date && slot && (isDemo || user) && (
            <form onSubmit={submitBooking} className="surface mt-4 space-y-4 p-5">
              <p className="text-sm font-medium">4. {isDemo ? "Simula la prenotazione" : "I tuoi dati"}</p>
              <p className="text-sm text-muted-foreground">
                {service.name} · {formatDateIt(date)} · {hhmm(slot)} · {euro(service.price)}
              </p>
              {isDemo && (
                <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                  Questa è una demo: puoi completare il flusso, ma non verrà creato alcun profilo, appuntamento o modifica nei dati del salone.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="b-name">Nome e cognome</Label>
                  <Input id="b-name" name="name" required maxLength={80} defaultValue={isDemo ? "" : String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-email">Email</Label>
                  <Input id="b-email" name="email" type="email" required defaultValue={isDemo ? "" : (user?.email ?? "")} />
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
              <Button type="submit" className="w-full" disabled={submitting}>
                {isDemo ? "Completa la demo" : "Conferma prenotazione"}
              </Button>
            </form>
          )}
            </section>
          </div>
        )}

        {salon?.plan === "professional" && ratings.length > 0 && (
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
