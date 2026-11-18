-- Complete the remaining auth.uid() init-plan optimization.
ALTER POLICY appt_client_insert ON public.appointments
  WITH CHECK (
    client_id = (SELECT auth.uid())
    AND status = 'pending'::public.appointment_status
  );
