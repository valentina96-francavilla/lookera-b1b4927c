import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Missing Supabase environment variables." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Unauthorized." }, 401);
    }

    const { data: isAdmin, error: adminError } =
      await userClient.rpc("is_super_admin");

    if (adminError || !isAdmin) {
      return json({ error: "Forbidden." }, 403);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const action = body?.action;

    if (action === "create") {
      const name = String(body?.name ?? "").trim();
      const email = String(body?.email ?? "").trim().toLowerCase();
      const password = String(body?.password ?? "");

      if (!name || !email || password.length < 8) {
        return json({ error: "Nome, email e password di almeno 8 caratteri sono obbligatori." }, 400);
      }

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (error) {
        return json({ error: error.message }, 400);
      }

      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: data.user.id, role: "client" });

      if (roleError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json({ error: roleError.message }, 400);
      }

      return json({ user: data.user });
    }

    if (action === "create_owner") {
      const salonId = String(body?.salon_id ?? "");
      const name = String(body?.name ?? "").trim();
      const email = String(body?.email ?? "").trim().toLowerCase();
      const password = String(body?.password ?? "");

      if (!salonId || !name || !email || password.length < 8) {
        return json({ error: "salon_id, nome, email e password di almeno 8 caratteri sono obbligatori." }, 400);
      }

      const { data: salon, error: salonError } = await admin
        .from("salons")
        .select("id, owner_id")
        .eq("id", salonId)
        .maybeSingle();

      if (salonError) return json({ error: salonError.message }, 400);
      if (!salon) return json({ error: "Salone non trovato." }, 404);
      if (salon.owner_id) {
        return json({ error: "Questo salone ha già un proprietario." }, 409);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (createError || !created.user) {
        return json({ error: createError?.message ?? "Impossibile creare il proprietario." }, 400);
      }

      const ownerId = created.user.id;

      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: ownerId, role: "owner" });

      if (roleError) {
        await admin.auth.admin.deleteUser(ownerId);
        return json({ error: roleError.message }, 400);
      }

      const { error: salonUpdateError } = await admin
        .from("salons")
        .update({ owner_id: ownerId })
        .eq("id", salonId);

      if (salonUpdateError) {
        await admin.from("user_roles").delete().eq("user_id", ownerId);
        await admin.auth.admin.deleteUser(ownerId);
        return json({ error: salonUpdateError.message }, 400);
      }

      return json({ owner: { id: ownerId, email: created.user.email, full_name: name } });
    }

    if (action === "update_role") {
      const userId = String(body?.user_id ?? "");
      const role = String(body?.role ?? "");

      if (!userId || !["owner", "client", "super_admin"].includes(role)) {
        return json({ error: "Ruolo non valido." }, 400);
      }

      if (userId === caller.id && role !== "super_admin") {
        return json({ error: "Non puoi rimuovere il tuo ruolo di Super Admin." }, 400);
      }

      const { error: insertRoleError } = await admin
        .from("user_roles")
        .upsert(
          { user_id: userId, role },
          { onConflict: "user_id" }
        );

      if (insertRoleError) {
        return json({ error: insertRoleError.message }, 400);
      }

      return json({ success: true });
    }

    if (action === "delete") {
      const userId = String(body?.user_id ?? "");

      if (!userId) {
        return json({ error: "user_id obbligatorio." }, 400);
      }

      if (userId === caller.id) {
        return json({ error: "Non puoi eliminare il tuo account da questa schermata." }, 400);
      }

      const { data: targetRoles, error: rolesError } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        return json({ error: rolesError.message }, 400);
      }

      if (targetRoles?.some((r) => r.role === "super_admin")) {
        return json({ error: "Un Super Admin non può essere eliminato da questa schermata." }, 400);
      }

      const { error } = await admin.auth.admin.deleteUser(userId);

      if (error) {
        return json({ error: error.message }, 400);
      }

      return json({ success: true });
    }

    return json({ error: "Azione non supportata." }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
