-- Harden LookEra RPC permissions and remove unnecessary SECURITY DEFINER use.
-- Public booking availability and public professional-plan ratings remain exposed intentionally.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
     AND _user_id = (SELECT auth.uid())
     AND EXISTS (
       SELECT 1
       FROM public.user_roles
       WHERE user_id = _user_id
         AND role = _role
     );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = 'super_admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_salon(_salon uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salons s
    WHERE s.id = _salon
      AND s.owner_id = (SELECT auth.uid())
  );
$$;

-- Role helpers are only for the signed-in user's own identity.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.owns_salon(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_salon(uuid) TO authenticated, service_role;

-- User directory is now served only by the JWT-protected admin-manage-user Edge Function.
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon, authenticated, service_role;

-- These functions are invoked only by their existing database triggers.
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_client_appointment_update() FROM PUBLIC, anon, authenticated, service_role;

-- btree_gist remains installed; move its objects out of the exposed public schema.
ALTER EXTENSION btree_gist SET SCHEMA extensions;

-- Evaluate auth.uid() once per statement in the profile INSERT policy.
ALTER POLICY profiles_insert_own ON public.profiles
  WITH CHECK (id = (SELECT auth.uid()));
