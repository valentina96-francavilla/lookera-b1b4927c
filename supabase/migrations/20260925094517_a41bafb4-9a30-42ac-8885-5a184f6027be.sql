CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'super_admin'::app_role) $$;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- existing policies reference these helpers; signed-in users need execute rights
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_salon(uuid) TO authenticated;

CREATE POLICY sa_read_appointments ON public.appointments FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY sa_read_profiles ON public.profiles FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY sa_read_user_roles ON public.user_roles FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY sa_read_blocked ON public.blocked_slots FOR SELECT TO authenticated USING (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, email text, full_name text, roles text[], created_at timestamptz, last_sign_in_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, COALESCE(p.full_name, ''),
         COALESCE(ARRAY(SELECT r.role::text FROM public.user_roles r WHERE r.user_id = u.id), '{}'),
         u.created_at, u.last_sign_in_at, u.updated_at
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;