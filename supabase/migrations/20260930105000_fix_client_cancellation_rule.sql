CREATE OR REPLACE FUNCTION public.validate_client_appointment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_appointment_at timestamp;
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
       OR NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
       OR NEW.start_time IS DISTINCT FROM OLD.start_time
       OR NEW.end_time IS DISTINCT FROM OLD.end_time
       OR NEW.service_id IS DISTINCT FROM OLD.service_id
       OR NEW.price IS DISTINCT FROM OLD.price
    THEN
      RAISE EXCEPTION 'Clients cannot change appointment details' USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status IN ('pending'::public.appointment_status, 'confirmed'::public.appointment_status)
         AND NEW.status = 'cancelled'::public.appointment_status
      THEN
        v_appointment_at := (OLD.appointment_date + OLD.start_time) AT TIME ZONE 'Europe/Rome';
        IF v_appointment_at <= now() + interval '24 hours' THEN
          RAISE EXCEPTION 'Puoi annullare solo fino a 24 ore prima. Contatta il salone.' USING ERRCODE = '42501';
        END IF;
      ELSE
        RAISE EXCEPTION 'Clients can only cancel appointments' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
