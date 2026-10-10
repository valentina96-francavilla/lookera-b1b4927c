import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, Scissors, Clock, Users, Star, LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ownerNav = [
  { to: "/dashboard", label: "Profilo negozio", icon: LayoutDashboard },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/servizi", label: "Servizi", icon: Scissors },
  { to: "/orari", label: "Orari", icon: Clock },
  { to: "/clienti", label: "Clienti", icon: Users },
  { to: "/recensioni", label: "Recensioni", icon: Star, professionalOnly: true },
];

const clientNav = [
  { to: "/prenotazioni", label: "Le mie prenotazioni", icon: CalendarDays },
  { to: "/prenota", label: "Prenota appuntamento", icon: CalendarDays },
];

export function AppShell({
  role,
  title,
  subtitle,
  actions,
  children,
  salonPlan,
}: {
  role: "owner" | "client";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  salonPlan?: "starter" | "professional" | "business";
}) {
  const nav = role === "owner"
    ? ownerNav.filter((item) => !item.professionalOnly || salonPlan === "professional")
    : clientNav;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">
            Look<span className="text-primary">Era</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
              <LogOut className="mr-1 h-4 w-4" /> Esci
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Apri menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-background px-4 py-2 lg:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Esci
            </button>
          </div>
        )}
      </header>

      <main className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6")}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}  return (
    <div className="min-h-screen bg-background">
      <div className="min-h-screen lg:flex">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
          <Link to="/" className="border-b border-border px-6 py-6 font-display text-2xl font-semibold tracking-tight">
            Look<span className="text-primary">Era</span><span className="ml-1 text-primary">✦</span>
          </Link>
          <nav className="flex-1 space-y-1 px-3 py-5">
            {nav.map((item) => (
              <Link key={item.to} to={item.to}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                activeProps={{ className: "flex items-center gap-3 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm ring-1 ring-primary/10" }}>
                <item.icon className="h-4 w-4 shrink-0" />{item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border p-4">
            <Button variant="outline" className="w-full justify-start rounded-xl" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Esci
            </Button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <Link to="/" className="font-display text-xl font-semibold tracking-tight lg:hidden">Look<span className="text-primary">Era</span></Link>
              <div className="hidden lg:block text-sm text-muted-foreground">{role === "owner" ? "Area proprietario" : "Area cliente"}</div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex lg:hidden"><LogOut className="mr-1 h-4 w-4" /> Esci</Button>
                <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Apri menu">
                  {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {open && <div className="border-t border-border bg-background px-3 py-3 lg:hidden">
              {nav.map((item) => <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
                activeProps={{ className: "flex items-center gap-3 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground" }}>
                <item.icon className="h-4 w-4" />{item.label}
              </Link>)}
              <button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted"><LogOut className="h-4 w-4" />Esci</button>
            </div>}
          </header>
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div><h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>
              {actions}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );rt { Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, Scissors, Clock, Users, Star, LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ownerNav = [
  { to: "/dashboard", label: "Profilo negozio", icon: LayoutDashboard },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/servizi", label: "Servizi", icon: Scissors },
  { to: "/orari", label: "Orari", icon: Clock },
  { to: "/clienti", label: "Clienti", icon: Users },
  { to: "/recensioni", label: "Recensioni", icon: Star, professionalOnly: true },
];

const clientNav = [
  { to: "/prenotazioni", label: "Le mie prenotazioni", icon: CalendarDays },
  { to: "/prenota", label: "Prenota appuntamento", icon: CalendarDays },
];

export function AppShell({
  role,
  title,
  subtitle,
  actions,
  children,
  salonPlan,
}: {
  role: "owner" | "client";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  salonPlan?: "starter" | "professional" | "business";
}) {
  const nav = role === "owner"
    ? ownerNav.filter((item) => !item.professionalOnly || salonPlan === "professional")
    : clientNav;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">
            Look<span className="text-primary">Era</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
              <LogOut className="mr-1 h-4 w-4" /> Esci
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Apri menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-background px-4 py-2 lg:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Esci
            </button>
          </div>
        )}
      </header>

      <main className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6")}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
