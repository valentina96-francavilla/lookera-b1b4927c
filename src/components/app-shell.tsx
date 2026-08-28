import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, Scissors, Clock, Users, Star, LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ownerNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/servizi", label: "Servizi", icon: Scissors },
  { to: "/orari", label: "Orari", icon: Clock },
  { to: "/clienti", label: "Clienti", icon: Users },
  { to: "/recensioni", label: "Recensioni", icon: Star },
];

const clientNav = [{ to: "/prenotazioni", label: "Le mie prenotazioni", icon: CalendarDays }];

export function AppShell({
  role,
  title,
  subtitle,
  actions,
  children,
}: {
  role: "owner" | "client";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const nav = role === "owner" ? ownerNav : clientNav;
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
