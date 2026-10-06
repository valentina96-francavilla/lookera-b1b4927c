-- Guarantee the appointment lifecycle starts with a request.
-- A newly inserted appointment is always pending; confirmation must be explicit.
CREATE OR REPLACE FUNCTION public.validate_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_service record;
  v_hours record;
  v_start timestamp := new.appointment_date + new.start_time;
  v_end timestamp := new.appointment_date + new.end_time;
begin
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending'::public.appointment_status;
  END IF;

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
$function$;
