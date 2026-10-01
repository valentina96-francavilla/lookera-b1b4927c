-- Allow salon owners to view and edit client profiles belonging to their salon.
drop policy if exists "profiles_owner_select_clients" on public.profiles;
drop policy if exists "profiles_owner_update_clients" on public.profiles;

create policy "profiles_owner_select_clients"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments a
    where a.client_id = profiles.id
      and owns_salon(a.salon_id)
  )
);

create policy "profiles_owner_update_clients"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.appointments a
    where a.client_id = profiles.id
      and owns_salon(a.salon_id)
  )
)
with check (
  exists (
    select 1
    from public.appointments a
    where a.client_id = profiles.id
      and owns_salon(a.salon_id)
  )
);
