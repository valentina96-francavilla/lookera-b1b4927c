import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({
    meta: [
      { title: "Super Admin — LookEra" },
      { name: "description", content: "Pannello di controllo globale della piattaforma LookEra." },
      { property: "og:title", content: "Super Admin — LookEra" },
      { property: "og:description", content: "Pannello di controllo globale della piattaforma LookEra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminLayout,
});

const nav = [
  { to: "/super-admin", label: "Panoramica", exact: true },
  { to: "/super-admin/salons", label: "Punti vendita" },
  { to: "/super-admin/appointments", label: "Appuntamenti" },
  { to: "/super-admin/users", label: "Utenti" },
] as const;

function SuperAdminLayout() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("is_super_admin");
      if (error) throw error;
      return data === true;
    },
  });

  if (q.isLoading) return <p className="p-10 text-sm text-muted-foreground">Verifica permessi…</p>;
  if (!q.data)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold">Accesso negato</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questa area è riservata agli amministratori della piattaforma.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Torna alla home</Link>
        </Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/super-admin" className="font-display text-xl font-semibold tracking-tight">
            Look<span className="text-primary">Era</span>{" "}
            <span className="text-sm font-normal text-muted-foreground">Super Admin</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 md:ml-6">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: "exact" in n }}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="mr-1 h-4 w-4" /> Esci
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
