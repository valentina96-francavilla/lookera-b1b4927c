-- Prevent clients from changing appointment ownership or lifecycle status.
-- Clients may edit their own appointment details, but status transitions are
-- controlled by the salon/super admin.

CREATE OR REPLACE FUNCTION public.validate_client_appointment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.is_super_admin()
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.role = 'client'::public.app_role
     )
  THEN
    IF NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.salon_id IS DISTINCT FROM OLD.salon_id
       OR NEW.status IS DISTINCT FROM OLD.status
    THEN
      RAISE EXCEPTION 'Clients cannot change appointment ownership, salon, or status'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_client_appointment_update ON public.appointments;
CREATE TRIGGER protect_client_appointment_update
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_client_appointment_update();

REVOKE ALL ON FUNCTION public.validate_client_appointment_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_client_appointment_update() TO authenticated;
