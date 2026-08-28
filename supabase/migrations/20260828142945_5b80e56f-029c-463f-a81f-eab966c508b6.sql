-- extensions
create extension if not exists btree_gist;

-- enums
create type public.app_role as enum ('owner','client');
create type public.appointment_status as enum ('pending','confirmed','completed','cancelled','no_show');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- user roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- salons
create table public.salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  address text,
  phone text,
  email text,
  image_url text,
  cancellation_hours int not null default 24,
  created_at timestamptz not null default now()
);
create index idx_salons_owner on public.salons(owner_id);
grant select on public.salons to anon;
grant select, insert, update, delete on public.salons to authenticated;
grant all on public.salons to service_role;
alter table public.salons enable row level security;

-- business hours
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  is_closed boolean not null default false,
  open_time time not null default '09:00',
  close_time time not null default '18:00',
  break_start time,
  break_end time,
  unique (salon_id, day_of_week)
);
create index idx_bh_salon on public.business_hours(salon_id);
grant select on public.business_hours to anon;
grant select, insert, update, delete on public.business_hours to authenticated;
grant all on public.business_hours to service_role;
alter table public.business_hours enable row level security;

-- services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null default 0 check (price >= 0),
  duration_min int not null check (duration_min > 0 and duration_min <= 600),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_services_salon on public.services(salon_id);
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;

-- blocked slots
create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index idx_blocked_salon_date on public.blocked_slots(salon_id, slot_date);
grant select, insert, update, delete on public.blocked_slots to authenticated;
grant all on public.blocked_slots to service_role;
alter table public.blocked_slots enable row level security;

-- appointments
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  client_id uuid references auth.users(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  price numeric(10,2) not null default 0,
  status public.appointment_status not null default 'pending',
  notes text,
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  slot tsrange generated always as (tsrange(appointment_date + start_time, appointment_date + end_time)) stored,
  constraint appointments_no_overlap exclude using gist (
    salon_id with =, slot with &&
  ) where (status in ('pending','confirmed','completed'))
);
create index idx_appt_salon_date on public.appointments(salon_id, appointment_date);
create index idx_appt_client on public.appointments(client_id);
create index idx_appt_service on public.appointments(service_id);
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;

-- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  appointment_id uuid unique references public.appointments(id) on delete cascade,
  client_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index idx_reviews_salon on public.reviews(salon_id);
grant select on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;

-- helper: is salon owner
create or replace function public.owns_salon(_salon uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.salons s where s.id = _salon and s.owner_id = auth.uid())
$$;

-- POLICIES
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "roles_select_own" on public.user_roles for select to authenticated using (user_id = auth.uid());

create policy "salons_public_read" on public.salons for select using (true);
create policy "salons_owner_insert" on public.salons for insert to authenticated with check (owner_id = auth.uid() and public.has_role(auth.uid(),'owner'));
create policy "salons_owner_update" on public.salons for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "salons_owner_delete" on public.salons for delete to authenticated using (owner_id = auth.uid());

create policy "hours_public_read" on public.business_hours for select using (true);
create policy "hours_owner_write" on public.business_hours for all to authenticated using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));

create policy "services_public_read" on public.services for select using (true);
create policy "services_owner_write" on public.services for all to authenticated using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));

create policy "blocked_owner_all" on public.blocked_slots for all to authenticated using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));

create policy "appt_owner_all" on public.appointments for all to authenticated using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));
create policy "appt_client_select" on public.appointments for select to authenticated using (client_id = auth.uid());
create policy "appt_client_insert" on public.appointments for insert to authenticated with check (client_id = auth.uid() and status = 'pending');
create policy "appt_client_update" on public.appointments for update to authenticated using (client_id = auth.uid()) with check (client_id = auth.uid());

create policy "reviews_public_read" on public.reviews for select using (true);
create policy "reviews_client_insert" on public.reviews for insert to authenticated with check (
  client_id = auth.uid() and exists (
    select 1 from public.appointments a
    where a.id = appointment_id and a.client_id = auth.uid()
      and a.salon_id = reviews.salon_id and a.status = 'completed'
  )
);
create policy "reviews_client_update" on public.reviews for update to authenticated using (client_id = auth.uid()) with check (client_id = auth.uid());

-- new user trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,''), new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, case when coalesce(new.raw_user_meta_data->>'role','client') = 'owner' then 'owner'::public.app_role else 'client'::public.app_role end)
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- appointment validation (server-side re-check)
create or replace function public.validate_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_service record;
  v_hours record;
  v_start timestamp := new.appointment_date + new.start_time;
  v_end timestamp := new.appointment_date + new.end_time;
begin
  select * into v_service from public.services where id = new.service_id;
  if v_service is null or v_service.salon_id <> new.salon_id then
    raise exception 'Servizio non valido per questo salone';
  end if;

  if new.status in ('cancelled','no_show') then
    return new;
  end if;

  if new.end_time <> (new.start_time + make_interval(mins => v_service.duration_min)) then
    new.end_time := new.start_time + make_interval(mins => v_service.duration_min);
    v_end := new.appointment_date + new.end_time;
  end if;
  new.price := v_service.price;

  select * into v_hours from public.business_hours
   where salon_id = new.salon_id and day_of_week = extract(dow from new.appointment_date)::int;
  if v_hours is null or v_hours.is_closed then
    raise exception 'Il salone e chiuso in questa data';
  end if;
  if new.start_time < v_hours.open_time or new.end_time > v_hours.close_time then
    raise exception 'Orario fuori dagli orari di apertura';
  end if;
  if v_hours.break_start is not null and v_hours.break_end is not null then
    if tsrange(v_start, v_end) && tsrange(new.appointment_date + v_hours.break_start, new.appointment_date + v_hours.break_end) then
      raise exception 'Orario in pausa';
    end if;
  end if;

  if exists (
    select 1 from public.blocked_slots b
    where b.salon_id = new.salon_id and b.slot_date = new.appointment_date
      and tsrange(v_start, v_end) && tsrange(b.slot_date + b.start_time, b.slot_date + b.end_time)
  ) then
    raise exception 'Fascia oraria non disponibile';
  end if;

  return new;
end;
$$;
create trigger appointments_validate before insert or update on public.appointments
for each row execute function public.validate_appointment();

-- availability engine
create or replace function public.available_slots(p_salon uuid, p_service uuid, p_date date)
returns setof time language plpgsql stable security definer set search_path = public as $$
declare
  v_dur int;
  v_hours record;
  t time;
  s timestamp;
  e timestamp;
  v_now timestamp := (now() at time zone 'Europe/Rome');
begin
  select duration_min into v_dur from public.services
   where id = p_service and salon_id = p_salon and is_active = true;
  if v_dur is null then return; end if;

  select * into v_hours from public.business_hours
   where salon_id = p_salon and day_of_week = extract(dow from p_date)::int;
  if v_hours is null or v_hours.is_closed then return; end if;

  t := v_hours.open_time;
  while (t + make_interval(mins => v_dur)) <= v_hours.close_time loop
    s := p_date + t;
    e := s + make_interval(mins => v_dur);
    if s > v_now
      and not (v_hours.break_start is not null and v_hours.break_end is not null
               and tsrange(s,e) && tsrange(p_date + v_hours.break_start, p_date + v_hours.break_end))
      and not exists (
        select 1 from public.appointments a
        where a.salon_id = p_salon and a.appointment_date = p_date
          and a.status in ('pending','confirmed','completed')
          and a.slot && tsrange(s,e))
      and not exists (
        select 1 from public.blocked_slots b
        where b.salon_id = p_salon and b.slot_date = p_date
          and tsrange(s,e) && tsrange(b.slot_date + b.start_time, b.slot_date + b.end_time))
    then
      return next t;
    end if;
    t := t + interval '15 minutes';
  end loop;
end;
$$;
grant execute on function public.available_slots(uuid, uuid, date) to anon, authenticated;

-- average rating helper
create or replace function public.salon_rating(p_salon uuid)
returns table (avg_rating numeric, review_count bigint)
language sql stable security definer set search_path = public as $$
  select round(avg(rating)::numeric, 2), count(*) from public.reviews where salon_id = p_salon
$$;
grant execute on function public.salon_rating(uuid) to anon, authenticated;

-- DEMO DATA
insert into public.salons (id, owner_id, name, slug, description, address, phone, email, image_url, cancellation_hours)
values ('11111111-1111-1111-1111-111111111111', null, 'Studio Beauty', 'studio-beauty',
 'Un salone moderno nel cuore della citta: taglio, colore e beauty con prodotti professionali e un team appassionato.',
 'Via Garibaldi 12, Milano', '+39 02 1234567', 'ciao@studiobeauty.it', null, 24);

insert into public.business_hours (salon_id, day_of_week, is_closed, open_time, close_time, break_start, break_end) values
 ('11111111-1111-1111-1111-111111111111', 0, true, '09:00','18:00', null, null),
 ('11111111-1111-1111-1111-111111111111', 1, true, '09:00','18:00', null, null),
 ('11111111-1111-1111-1111-111111111111', 2, false, '09:00','18:00', '13:00','14:00'),
 ('11111111-1111-1111-1111-111111111111', 3, false, '09:00','18:00', '13:00','14:00'),
 ('11111111-1111-1111-1111-111111111111', 4, false, '09:00','19:00', '13:00','14:00'),
 ('11111111-1111-1111-1111-111111111111', 5, false, '09:00','19:00', '13:00','14:00'),
 ('11111111-1111-1111-1111-111111111111', 6, false, '09:00','17:00', null, null);

insert into public.services (id, salon_id, name, description, price, duration_min, is_active) values
 ('22222222-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Taglio capelli','Consulenza, shampoo e taglio personalizzato.',25,45,true),
 ('22222222-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Piega','Piega con phon e styling finale.',20,30,true),
 ('22222222-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Colore','Colorazione professionale con prodotti delicati.',50,90,true),
 ('22222222-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Manicure','Manicure completa con smalto a scelta.',25,45,true);

insert into public.appointments (salon_id, service_id, appointment_date, start_time, end_time, price, status, customer_name, customer_email, customer_phone, notes) values
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000001', current_date, '10:00','10:45',25,'confirmed','Giulia Rossi','giulia.rossi@example.com','+39 333 1112222','Preferisce taglio scalato'),
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000003', current_date, '15:00','16:30',50,'pending','Marta Bianchi','marta.bianchi@example.com','+39 333 3334444',null),
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000002', current_date + 1, '11:00','11:30',20,'confirmed','Sara Conti','sara.conti@example.com','+39 333 5556666',null),
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000004', current_date - 7, '09:30','10:15',25,'completed','Giulia Rossi','giulia.rossi@example.com','+39 333 1112222',null),
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000001', current_date - 14, '16:00','16:45',25,'completed','Elena Ferri','elena.ferri@example.com','+39 333 7778888',null);

insert into public.reviews (salon_id, appointment_id, client_id, author_name, rating, comment)
select '11111111-1111-1111-1111-111111111111', a.id, null, a.customer_name,
  case when a.customer_name = 'Giulia Rossi' then 5 else 4 end,
  case when a.customer_name = 'Giulia Rossi' then 'Manicure perfetta e personale gentilissimo. Torno sicuramente!'
       else 'Taglio davvero curato, ambiente pulito e accogliente.' end
from public.appointments a
where a.salon_id = '11111111-1111-1111-1111-111111111111' and a.status = 'completed';