import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scissors, User, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accedi o registrati — LookEra" },
      {
        name: "description",
        content:
          "Accedi a LookEra per gestire il tuo salone o prenotare il tuo prossimo appuntamento online.",
      },
      { property: "og:title", content: "Accedi o registrati — LookEra" },
      {
        property: "og:description",
        content: "Gestisci il tuo salone o prenota online in pochi secondi con LookEra.",
      },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Inserisci il tuo nome").max(80),
  email: z.string().trim().email("Email non valida").max(255),
  password: z.string().min(8, "Almeno 8 caratteri").max(72),
  phone: z.string().trim().max(30).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"owner" | "client">("client");
  const [tab, setTab] = useState("login");
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  function getReturnTo() {
    const value = new URLSearchParams(window.location.search).get("returnTo");
    return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
  }

  function redirectAfterAuth() {
    window.location.href = getReturnTo() || "/prenotazioni";
  }

  useEffect(() => {
    async function redirectIfAuthenticated() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const tokenType = params.get("type");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Errore conferma email:", error);
          toast.error("Non è stato possibile confermare l'email. Richiedi un nuovo link.");
          return;
        }
        params.delete("code");
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (params.toString() ? `?${params.toString()}` : ""),
        );
      } else if (tokenHash && tokenType === "email") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });
        if (error) {
          console.error("Errore conferma email:", error);
          toast.error("Non è stato possibile confermare l'email. Richiedi un nuovo link.");
          return;
        }
        params.delete("token_hash");
        params.delete("type");
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (params.toString() ? `?${params.toString()}` : ""),
        );
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const returnTo = getReturnTo();
      if (returnTo) {
        window.location.href = returnTo;
        return;
      }

      const { data: isSuperAdmin } = await (supabase.rpc as any)("is_super_admin");
      if (isSuperAdmin === true) {
        navigate({ to: "/super-admin" });
        return;
      }

      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const roles = (roleRows ?? []).map((r) => r.role);
      navigate({ to: roles.includes("owner") ? "/dashboard" : "/prenotazioni" });
    }

    void redirectIfAuthenticated();
  }, [navigate]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("Invalid login")
          ? "Email o password non corretti"
          : error.message,
      );
      return;
    }
    if (getReturnTo()) {
      redirectAfterAuth();
      return;
    }

    const { data: isSuperAdmin } = await (supabase.rpc as any)("is_super_admin");
    if (isSuperAdmin === true) {
      navigate({ to: "/super-admin" });
      return;
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");

    const roles = (roleRows ?? []).map((r) => r.role);
    navigate({ to: roles.includes("owner") ? "/dashboard" : "/prenotazioni" });
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      phone: String(form.get("phone") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dati non validi");
      return;
    }

    setLoading(true);
    const returnTo = getReturnTo();
    const emailRedirectTo = returnTo
      ? `${window.location.origin}/auth?returnTo=${encodeURIComponent(returnTo)}`
      : `${window.location.origin}/auth`;

    const { data: signupData, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          role,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Esiste già un account con questa email"
          : error.message,
      );
      return;
    }

    if (signupData.session && getReturnTo()) {
      redirectAfterAuth();
      return;
    }

    setConfirmationEmail(parsed.data.email);
  }

  async function resendConfirmation() {
    if (!confirmationEmail) return;
    setLoading(true);
    const returnTo = getReturnTo();
    const emailRedirectTo = returnTo
      ? `${window.location.origin}/auth?returnTo=${encodeURIComponent(returnTo)}`
      : `${window.location.origin}/auth`;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: confirmationEmail,
      options: { emailRedirectTo },
    });
    setLoading(false);

    if (error) {
      toast.error("Non è stato possibile reinviare l'email.");
      return;
    }
    toast.success("Email di conferma reinviata.");
  }

  if (confirmationEmail) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="px-4 py-5 sm:px-8">
          <Link to="/" className="font-display text-xl font-semibold">
            Look<span className="text-primary">Era</span>
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-md">
            <div className="surface p-6 text-center sm:p-8">
              <MailCheck className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-5 text-2xl">Controlla la tua email</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Abbiamo inviato un link di conferma a <strong>{confirmationEmail}</strong>.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Dopo aver confermato l'account, tornerai automaticamente alla prenotazione che hai scelto.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full"
                onClick={() => void resendConfirmation()}
                disabled={loading}
              >
                {loading ? "Invio…" : "Reinvia email di conferma"}
              </Button>
              <Link
                to="/auth"
                className="mt-4 block text-sm text-muted-foreground underline"
                onClick={() => setConfirmationEmail(null)}
              >
                Torna all'accesso
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-4 py-5 sm:px-8">
        <Link to="/" className="font-display text-xl font-semibold">
          Look<span className="text-primary">Era</span>
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="surface p-6 sm:p-8">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Accedi</TabsTrigger>
                <TabsTrigger value="signup">Registrati</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <h1 className="text-2xl">Bentornata</h1>
                <p className="mt-1 mb-6 text-sm text-muted-foreground">
                  Accedi al tuo account LookEra.
                </p>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" name="password" type="password" required autoComplete="current-password" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Accesso…" : "Accedi"}
                  </Button>
                  <Link to="/recupera-password" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
                    Password dimenticata?
                  </Link>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <h1 className="text-2xl">Crea il tuo account</h1>
                <p className="mt-1 mb-6 text-sm text-muted-foreground">
                  Bastano trenta secondi, nessuna carta richiesta.
                </p>
                <div className="mb-5 grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: "owner", label: "Ho un salone", icon: Scissors },
                      { key: "client", label: "Voglio prenotare", icon: User },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRole(opt.key)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-sm transition-colors",
                        role === opt.key ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted",
                      )}
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome e cognome</Label>
                    <Input id="signup-name" name="fullName" required maxLength={80} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefono (opzionale)</Label>
                    <Input id="signup-phone" name="phone" type="tel" maxLength={30} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" name="password" type="password" required minLength={8} autoComplete="new-password" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creazione…" : "Inizia gratis"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
