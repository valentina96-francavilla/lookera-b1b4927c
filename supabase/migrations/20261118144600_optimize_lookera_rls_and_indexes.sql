-- Optimize row-level security expressions and add indexes for foreign keys.
-- Remove only three policies proven to be exact duplicates of the retained super-admin policies.

ALTER POLICY profiles_select_own ON public.profiles
  USING (id = (SELECT auth.uid()));
ALTER POLICY profiles_update_own ON public.profiles
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
ALTER POLICY roles_select_own ON public.user_roles
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY salons_owner_insert ON public.salons
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (SELECT public.has_role((SELECT auth.uid()), 'owner'::public.app_role))
  );
ALTER POLICY salons_owner_update ON public.salons
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
ALTER POLICY salons_owner_delete ON public.salons
  USING (owner_id = (SELECT auth.uid()));

ALTER POLICY appt_client_select ON public.appointments
  USING (client_id = (SELECT auth.uid()));
ALTER POLICY appt_client_update ON public.appointments
  USING (client_id = (SELECT auth.uid()))
  WITH CHECK (client_id = (SELECT auth.uid()));

ALTER POLICY reviews_client_insert ON public.reviews
  WITH CHECK (
    client_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.id = reviews.appointment_id
        AND a.client_id = (SELECT auth.uid())
        AND a.salon_id = reviews.salon_id
        AND a.status = 'completed'::public.appointment_status
    )
  );
ALTER POLICY reviews_client_update ON public.reviews
  USING (client_id = (SELECT auth.uid()))
  WITH CHECK (client_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS appointments_client_id_idx ON public.appointments (client_id);
CREATE INDEX IF NOT EXISTS appointments_service_id_idx ON public.appointments (service_id);
CREATE INDEX IF NOT EXISTS blocked_slots_salon_id_idx ON public.blocked_slots (salon_id);
CREATE INDEX IF NOT EXISTS reviews_client_id_idx ON public.reviews (client_id);
CREATE INDEX IF NOT EXISTS reviews_salon_id_idx ON public.reviews (salon_id);
CREATE INDEX IF NOT EXISTS salons_owner_id_idx ON public.salons (owner_id);
CREATE INDEX IF NOT EXISTS services_salon_id_idx ON public.services (salon_id);

DROP POLICY IF EXISTS super_admin_manage_business_hours ON public.business_hours;
DROP POLICY IF EXISTS super_admin_manage_salons ON public.salons;
DROP POLICY IF EXISTS super_admin_manage_services ON public.services;
