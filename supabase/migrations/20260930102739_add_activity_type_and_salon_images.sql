alter table public.salons
  add column if not exists activity_type text;

update public.salons
set activity_type = coalesce(activity_type, 'Parrucchiere')
where activity_type is null;

alter table public.salons
  alter column activity_type set default 'Parrucchiere';

alter table public.salons
  add constraint salons_activity_type_check
  check (activity_type in ('Salone di bellezza','Centro estetico','Parrucchiere','Barbiere'));

create index if not exists salons_activity_type_idx
  on public.salons(activity_type);

insert into storage.buckets (id, name, public)
values ('salon-images', 'salon-images', true)
on conflict (id) do update set public = true;

drop policy if exists "salon_images_public_read" on storage.objects;
create policy "salon_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'salon-images');

drop policy if exists "salon_images_owner_insert" on storage.objects;
create policy "salon_images_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'salon-images'
  and (public.is_super_admin() or public.owns_salon((storage.foldername(name))[1]::uuid))
);

drop policy if exists "salon_images_owner_update" on storage.objects;
create policy "salon_images_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'salon-images'
  and (public.is_super_admin() or public.owns_salon((storage.foldername(name))[1]::uuid))
)
with check (
  bucket_id = 'salon-images'
  and (public.is_super_admin() or public.owns_salon((storage.foldername(name))[1]::uuid))
);

drop policy if exists "salon_images_owner_delete" on storage.objects;
create policy "salon_images_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'salon-images'
  and (public.is_super_admin() or public.owns_salon((storage.foldername(name))[1]::uuid))
);
