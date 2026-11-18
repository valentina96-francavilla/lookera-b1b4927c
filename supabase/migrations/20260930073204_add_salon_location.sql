-- Location data for public salon discovery
alter table public.salons
  add column if not exists region text,
  add column if not exists province text,
  add column if not exists city text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists idx_salons_location
  on public.salons(region, province, city);

create index if not exists idx_salons_city
  on public.salons(city);

-- Super-admin must be able to create/manage clients through the existing admin edge function.
-- Existing RLS remains unchanged because the edge function uses the service role.

update public.salons
set region = 'Lombardia',
    province = 'Milano',
    city = 'Milano',
    latitude = 45.4642,
    longitude = 9.1900
where slug = 'studio-beauty';
