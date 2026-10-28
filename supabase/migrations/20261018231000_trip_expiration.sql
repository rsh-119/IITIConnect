alter table public.trips drop constraint trips_status_check;
alter table public.trips add constraint trips_status_check
  check (status in ('open','cancelled','completed','expired'));
alter table public.journey_legs drop constraint journey_legs_status_check;
alter table public.journey_legs add constraint journey_legs_status_check
  check (status in ('open','cancelled','completed','expired'));

create function private.expire_open_trips() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.trips t set status='expired',updated_at=now()
  where t.status='open'
    and exists (select 1 from public.journey_legs l where l.trip_id=t.id)
    and not exists (select 1 from public.journey_legs l
      where l.trip_id=t.id and l.status='open' and l.departure_at>now());
  get diagnostics v_count = row_count;
  update public.journey_legs set status='expired'
  where status='open' and departure_at<=now();
  return v_count;
end $$;
revoke all on function private.expire_open_trips() from public,anon,authenticated;

create or replace function public.set_trip_status(p_trip_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_trip public.trips%rowtype;
begin
  select * into v_trip from public.trips where id=p_trip_id for update;
  if v_trip.id is null or v_trip.organizer_id <> auth.uid() or v_trip.campus_id <> private.active_campus_id()
     or p_status not in ('cancelled','completed')
     or (v_trip.status <> 'open' and not (v_trip.status='expired' and p_status='completed')) then
    raise exception 'Trip unavailable' using errcode='22023';
  end if;
  update public.trips set status=p_status,version=version+1,updated_at=now() where id=p_trip_id;
  update public.journey_legs set status=p_status
  where trip_id=p_trip_id and (p_status='cancelled' or status in ('open','expired'));
end $$;
