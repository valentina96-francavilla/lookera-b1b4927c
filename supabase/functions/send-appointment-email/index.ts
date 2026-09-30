import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("LOOKERA_FROM_EMAIL") ?? "LookEra <onboarding@resend.dev>";

const admin = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function html(title: string, body: string) {
  return `<!doctype html>
<html lang="it">
  <body style="margin:0;background:#f7f5f2;font-family:Arial,sans-serif;color:#26231f">
    <div style="max-width:600px;margin:32px auto;background:#fff;padding:36px;border-radius:16px">
      <div style="font-size:22px;font-weight:700;letter-spacing:.2px;margin-bottom:28px">LookEra</div>
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 20px">${title}</h1>
      <div style="font-size:15px;line-height:1.7">${body}</div>
      <p style="margin-top:32px;color:#777;font-size:13px">
        A presto,<br><strong>Il team LookEra</strong>
      </p>
    </div>
  </body>
</html>`;
}

async function sendEmail(to: string, subject: string, content: string) {
  if (!resendApiKey) throw new Error("RESEND_API_KEY non configurata");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html: content,
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend error: ${message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autenticato");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Utente non autenticato");

    const { appointment_id, event } = await req.json() as {
      appointment_id: string;
      event: "requested" | "confirmed";
    };

    if (!appointment_id || !event) throw new Error("Dati mancanti");

    const { data: appointment, error } = await admin
      .from("appointments")
      .select("id,client_id,salon_id,appointment_date,start_time,end_time,status,customer_name,customer_email,services(name),salons(name,address,email,owner_id)")
      .eq("id", appointment_id)
      .single();

    if (error || !appointment) throw new Error("Appuntamento non trovato");

    const salon = appointment.salons as {
      name: string;
      address: string | null;
      email: string | null;
      owner_id: string | null;
    } | null;
    const service = appointment.services as { name: string } | null;

    if (event === "requested") {
      if (appointment.client_id !== user.id) throw new Error("Non autorizzato");
      if (appointment.status !== "pending") throw new Error("L'appuntamento non è in attesa");

      let ownerEmail: string | null = null;
      if (salon?.owner_id) {
        const { data: ownerProfile } = await admin
          .from("profiles")
          .select("email")
          .eq("id", salon.owner_id)
          .maybeSingle();
        ownerEmail = ownerProfile?.email ?? null;
      }

      // The owner's account email is the source of truth for owner notifications.
      // Fall back to the salon contact email only for legacy salons without a linked owner.
      if (!ownerEmail) ownerEmail = salon?.email ?? null;

      await sendEmail(
        appointment.customer_email,
        "Richiesta di appuntamento ricevuta | LookEra",
        html(
          "Abbiamo ricevuto la tua richiesta",
          `Ciao ${appointment.customer_name || "Cliente"},<br><br>
          la tua richiesta di appuntamento presso <strong>${salon?.name ?? "il salone"}</strong> è stata ricevuta correttamente.<br><br>
          <strong>Servizio:</strong> ${service?.name ?? "—"}<br>
          <strong>Data:</strong> ${appointment.appointment_date}<br>
          <strong>Ora:</strong> ${appointment.start_time.slice(0, 5)}<br><br>
          L'appuntamento è <strong>in attesa di conferma</strong> da parte del salone.<br>
          Ti invieremo una nuova email non appena sarà confermato.`
        ),
      );

      if (ownerEmail) {
        await sendEmail(
          ownerEmail,
          `Nuova richiesta di appuntamento | ${salon?.name ?? "LookEra"}`,
          html(
            "Hai una nuova richiesta",
            `È arrivata una nuova richiesta di appuntamento da <strong>${appointment.customer_name || "un cliente"}</strong>.<br><br>
            <strong>Servizio:</strong> ${service?.name ?? "—"}<br>
            <strong>Data:</strong> ${appointment.appointment_date}<br>
            <strong>Ora:</strong> ${appointment.start_time.slice(0, 5)}<br><br>
            Accedi a <strong>LookEra</strong> per visualizzare la richiesta e gestire l'appuntamento.`
          ),
        );
      }
    }

    if (event === "confirmed") {
      const { data: ownerRole } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["owner", "super_admin"])
        .maybeSingle();

      const isOwner = salon?.owner_id === user.id;
      const isSuperAdmin = ownerRole?.role === "super_admin";
      if (!isOwner && !isSuperAdmin) throw new Error("Non autorizzato");
      if (appointment.status !== "confirmed") throw new Error("L'appuntamento non è confermato");

      await sendEmail(
        appointment.customer_email,
        "Il tuo appuntamento è confermato | LookEra",
        html(
          "Appuntamento confermato",
          `Ciao ${appointment.customer_name || "Cliente"},<br><br>
          il salone ha confermato il tuo appuntamento. Ti aspettiamo!<br><br>
          <div style="padding:18px;background:#f7f5f2;border-radius:12px">
            <strong>${salon?.name ?? "—"}</strong><br><br>
            <strong>Servizio:</strong> ${service?.name ?? "—"}<br>
            <strong>Data:</strong> ${appointment.appointment_date}<br>
            <strong>Ora:</strong> ${appointment.start_time.slice(0, 5)}${salon?.address ? `<br><strong>Indirizzo:</strong> ${salon.address}` : ""}
          </div><br>
          Se hai bisogno di modificare o annullare l'appuntamento, accedi a LookEra e consulta la sezione <strong>I miei appuntamenti</strong>.`
        ),
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
