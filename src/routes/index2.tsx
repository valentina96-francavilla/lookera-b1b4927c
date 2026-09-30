import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CalendarCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/index2")({
  head: () => ({
    meta: [
      { title: "LookEra — Scopri la demo" },
      {
        name: "description",
        content:
          "Scopri LookEra attraverso una demo e contatta Valeya Studio per ricevere maggiori informazioni.",
      },
    ],
  }),
  component: DemoLanding,
});

function DemoLanding() {
  const [contactOpen, setContactOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    "Ciao, sono interessato a LookEra. Vorrei maggiori informazioni.",
  );

  function handleContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const subject = "Richiesta informazioni su LookEra";
    const body = `${message}

La mia email: ${email}`;

    window.location.href =
      `mailto:hello@valeyastudio.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <a href="https://valeyastudio.it/" className="font-display text-xl font-semibold">
            VALE<span className="text-primary">⟡</span>YA <span className="text-muted-foreground">STUDIO</span>
          </a>
          <span className="text-sm text-muted-foreground">LookEra</span>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
            <CalendarCheck className="h-3.5 w-3.5" />
            DIGITAL PRODUCT BY VALEYA STUDIO
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Scopri come funziona LookEra.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Un modo semplice per gestire appuntamenti, servizi e prenotazioni online
            per parrucchieri, barbieri e centri beauty.
          </p>

          <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
            <Button asChild size="lg" className="h-14">
              <a href="/salon/studio-beauty">
                Demo pagina salone
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>

            <Button asChild size="lg" variant="outline" className="h-14">
              <a href="/salon/studio-beauty">
                Demo prenotazione
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Contattaci per maggiori informazioni
            </button>
          </div>

          <p className="mx-auto mt-4 max-w-xl text-xs text-muted-foreground">
            La demo è liberamente consultabile. Per informazioni su LookEra o per
            sapere quando sarà disponibile, scrivici.
          </p>
        </section>
      </main>

      {contactOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setContactOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl sm:p-8">
            <button
              type="button"
              onClick={() => setContactOpen(false)}
              aria-label="Chiudi"
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 id="contact-title" className="pr-8 text-2xl">
              Parliamo di LookEra
            </h2>
            <p className="mt-2 pr-8 text-sm text-muted-foreground">
              Lasciaci la tua email e inviaci il messaggio. Ti ricontatteremo per
              darti maggiori informazioni.
            </p>

            <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">La tua email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@email.it"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message">Messaggio</Label>
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                />
              </div>

              <Button type="submit" className="w-full">
                Invia richiesta
              </Button>
            </form>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              La richiesta viene preparata per essere inviata a hello@valeyastudio.it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
