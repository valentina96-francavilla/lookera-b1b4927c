import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Clock,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Check,
  ArrowRight,
} from "lucide-react";
import heroImage from "@/assets/hero-salon.jpg";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LookEra — Prenotazioni online semplici per saloni" },
      {
        name: "description",
        content:
          "LookEra è il gestionale leggero per parrucchieri, barbieri e centri estetici: agenda, servizi e prenotazioni online in un'unica app.",
      },
      { property: "og:title", content: "LookEra — Prenotazioni online per saloni" },
      {
        property: "og:description",
        content:
          "Il tuo salone. Il tuo orario. Le tue prenotazioni. Agenda e booking online in pochi minuti.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  {
    icon: Sparkles,
    title: "Crea il tuo salone",
    text: "Nome, contatti, foto: la tua scheda pubblica è pronta in due minuti.",
  },
  {
    icon: Clock,
    title: "Imposta orari e servizi",
    text: "Orari giorno per giorno, pause, chiusure, prezzi e durate.",
  },
  {
    icon: CalendarCheck,
    title: "Ricevi prenotazioni",
    text: "I clienti prenotano dal link del salone, tu gestisci tutto dall'agenda.",
  },
];

const benefits = [
  { icon: CalendarCheck, title: "Agenda sempre aggiornata", text: "Vista giorno, settimana e mese con stati chiari." },
  { icon: Clock, title: "Zero doppie prenotazioni", text: "Gli slot si calcolano su orari, pause e durate reali." },
  { icon: Users, title: "Clienti a portata di mano", text: "Storico, contatti e prossimo appuntamento in una scheda." },
  { icon: Star, title: "Recensioni verificate", text: "Solo chi è stato davvero in salone può recensire." },
];

const faqs = [
  {
    q: "Serve installare qualcosa?",
    a: "No. LookEra funziona dal browser, su computer, tablet e smartphone.",
  },
  {
    q: "I miei clienti devono scaricare un'app?",
    a: "No: prenotano dalla pagina pubblica del salone, ottimizzata per il mobile.",
  },
  {
    q: "Posso inserire appuntamenti presi al telefono?",
    a: "Sì, dall'agenda puoi creare un appuntamento manuale in pochi secondi.",
  },
  {
    q: "Come funzionano le cancellazioni?",
    a: "Imposti quante ore prima un cliente può annullare: LookEra applica la regola in automatico.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="font-display text-xl font-semibold">
            Look<span className="text-primary">Era</span>
          </span>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#come-funziona" className="hover:text-foreground">Come funziona</a>
            <a href="#saloni" className="hover:text-foreground">Per i saloni</a>
            <a href="#prezzi" className="hover:text-foreground">Prezzi</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Accedi</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Inizia gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Semplice, veloce, mobile
          </span>
          <h1 className="mt-5 text-4xl leading-tight sm:text-5xl">
            Il tuo salone. Il tuo orario. Le tue prenotazioni.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            LookEra rende la prenotazione online semplice per i saloni e immediata per i clienti.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Inizia gratis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#come-funziona">Scopri come funziona</a>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Vuoi vedere una pagina di prenotazione vera?{" "}
            <Link
              to="/salon/$slug"
              params={{ slug: "studio-beauty" }}
              className="text-primary underline-offset-4 hover:underline"
            >
              Prova la demo Studio Beauty
            </Link>
          </p>
        </div>
        <div className="relative">
          <img
            src={heroImage}
            alt="Interno luminoso di un salone di parrucchieri con poltrona e specchio"
            width={1408}
            height={1008}
            className="w-full rounded-3xl border border-border object-cover shadow-[var(--shadow-lift)]"
          />
        </div>
      </section>

      {/* Come funziona */}
      <section id="come-funziona" className="border-y border-border bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl">Come funziona</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Tre passaggi per passare dal quaderno alle prenotazioni online.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="surface p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                  Passo {i + 1}
                </p>
                <h3 className="mt-1 text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vantaggi saloni */}
      <section id="saloni" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl">Pensato per chi lavora in salone</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="surface flex gap-4 p-6">
              <b.icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="text-lg">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Esperienza cliente */}
      <section className="border-y border-border bg-muted/40 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl">Prenotare diventa naturale</h2>
            <p className="mt-3 text-muted-foreground">
              Nessuna telefonata, nessuna attesa. Il cliente sceglie servizio, giorno e orario
              disponibile in quattro tap.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Slot reali calcolati sugli orari del salone",
                "Riepilogo chiaro con prezzo e durata",
                "Storico prenotazioni e cancellazione self-service",
                "Recensione dopo l'appuntamento",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="surface mx-auto w-full max-w-sm p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" /> Anteprima prenotazione
            </div>
            <div className="mt-4 space-y-3">
              {[
                { l: "Servizio", v: "Taglio capelli" },
                { l: "Data", v: "Giovedì 12" },
                { l: "Orario", v: "10:30" },
                { l: "Durata", v: "45 minuti" },
                { l: "Prezzo", v: "€ 25,00" },
              ].map((row) => (
                <div key={row.l} className="flex justify-between border-b border-border pb-2 text-sm">
                  <span className="text-muted-foreground">{row.l}</span>
                  <span className="font-medium">{row.v}</span>
                </div>
              ))}
            </div>
            <Button className="mt-5 w-full" asChild>
              <Link to="/salon/$slug" params={{ slug: "studio-beauty" }}>
                Conferma prenotazione
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Prezzi */}
      <section id="prezzi" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl">Prezzi trasparenti</h2>
        <p className="mt-2 text-muted-foreground">Inizia gratis, cresci quando ti serve.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="surface p-7">
            <h3 className="text-xl">Start</h3>
            <p className="mt-1 text-sm text-muted-foreground">Per iniziare subito</p>
            <p className="mt-5 text-4xl font-semibold">€0</p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>Agenda e prenotazioni online</li>
              <li>Servizi e orari illimitati</li>
              <li>Pagina pubblica del salone</li>
            </ul>
            <Button asChild className="mt-6 w-full">
              <Link to="/auth">Inizia gratis</Link>
            </Button>
          </div>
          <div className="surface border-primary/40 p-7">
            <h3 className="text-xl">Pro</h3>
            <p className="mt-1 text-sm text-muted-foreground">In arrivo</p>
            <p className="mt-5 text-4xl font-semibold">
              €19<span className="text-base font-normal text-muted-foreground">/mese</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>Promemoria automatici</li>
              <li>Statistiche avanzate</li>
              <li>Team e più sedi</li>
            </ul>
            <Button variant="outline" className="mt-6 w-full" disabled>
              Presto disponibile
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-muted/40 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl">Domande frequenti</h2>
          <Accordion type="single" collapsible className="mt-6">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA finale */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl sm:text-4xl">Pronta a liberare il telefono?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Configura il tuo salone oggi e ricevi la prima prenotazione online entro stasera.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/auth">Inizia gratis</Link>
        </Button>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:px-6">
          <span className="font-display text-base text-foreground">
            Look<span className="text-primary">Era</span>
          </span>
          <span>© {new Date().getFullYear()} LookEra — prenotazioni per saloni</span>
        </div>
      </footer>
    </div>
  );
}
