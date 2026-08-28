import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recupera-password")({
  head: () => ({
    meta: [
      { title: "Recupera password — LookEra" },
      {
        name: "description",
        content: "Reimposta la password del tuo account LookEra in pochi passaggi.",
      },
      { property: "og:title", content: "Recupera password — LookEra" },
      {
        property: "og:description",
        content: "Reimposta la password del tuo account LookEra in pochi passaggi.",
      },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setRecoveryMode(true);
    }
    return () => sub.subscription.unsubscribe();
  }, []);

  async function requestReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recupera-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Ti abbiamo inviato un'email con il link di recupero.");
  }

  async function updatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (password.length < 8) {
      toast.error("La password deve avere almeno 8 caratteri");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password aggiornata");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-4 py-5 sm:px-8">
        <Link to="/" className="font-display text-xl font-semibold">
          Look<span className="text-primary">Era</span>
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md surface p-6 sm:p-8">
          {recoveryMode ? (
            <>
              <h1 className="text-2xl">Nuova password</h1>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">
                Scegli una nuova password per il tuo account.
              </p>
              <form onSubmit={updatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nuova password</Label>
                  <Input id="new-password" name="password" type="password" required minLength={8} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Aggiorna password
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl">Recupera password</h1>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">
                Inserisci la tua email: ti invieremo un link per reimpostarla.
              </p>
              {sent ? (
                <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  Se esiste un account con quella email, il link di recupero è in arrivo.
                </p>
              ) : (
                <form onSubmit={requestReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input id="reset-email" name="email" type="email" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Invia link di recupero
                  </Button>
                </form>
              )}
              <Link
                to="/auth"
                className="mt-4 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Torna al login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
