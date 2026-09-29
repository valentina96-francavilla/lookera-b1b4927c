-- Super Admin: allow global CRUD on tenant-owned data while preserving owner RLS.
-- Uses the existing SECURITY DEFINER is_super_admin() helper so the browser
-- never needs a service-role key.

DROP POLICY IF EXISTS "salons_super_admin_all" ON public.salons;
CREATE POLICY "salons_super_admin_all"
ON public.salons
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "hours_super_admin_all" ON public.business_hours;
CREATE POLICY "hours_super_admin_all"
ON public.business_hours
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "services_super_admin_all" ON public.services;
CREATE POLICY "services_super_admin_all"
ON public.services
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "blocked_super_admin_all" ON public.blocked_slots;
CREATE POLICY "blocked_super_admin_all"
ON public.blocked_slots
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "appointments_super_admin_all" ON public.appointments;
CREATE POLICY "appointments_super_admin_all"
ON public.appointments
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "reviews_super_admin_all" ON public.reviews;
CREATE POLICY "reviews_super_admin_all"
ON public.reviews
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "profiles_super_admin_all" ON public.profiles;
CREATE POLICY "profiles_super_admin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Keep user_roles protected: the existing admin user-management flow should
-- remain the only path for changing roles.
