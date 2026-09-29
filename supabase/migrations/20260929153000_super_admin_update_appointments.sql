-- Allow Super Admin to manage appointments globally.
CREATE POLICY sa_update_appointments
ON public.appointments
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
