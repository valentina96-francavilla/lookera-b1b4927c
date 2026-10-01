-- LookEra: every new appointment must belong to a registered client account.
drop policy if exists "appt_guest_insert" on public.appointments;
drop policy if exists "appt_client_insert" on public.appointments;

create policy "appt_client_insert"
on public.appointments
for insert
to authenticated
with check (
  client_id = auth.uid()
  and status = 'pending'::appointment_status
);
