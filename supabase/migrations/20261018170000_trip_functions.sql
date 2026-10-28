create function public.create_trip(p_legs jsonb, p_accepts_items boolean default false, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_campus uuid := private.active_campus_id();
  v_trip uuid;
  v_leg jsonb;
  v_direction text;
  v_origin uuid;
  v_destination uuid;
  v_departure timestamptz;
  v_seats smallint;
  v_fare numeric(10,2);
  v_order integer := 0;
  v_outward_origin uuid;
  v_outward_destination uuid;
  v_outward_departure timestamptz;
begin
  if v_campus is null then raise exception 'Account unavailable' using errcode='28000'; end if;
  if jsonb_typeof(p_legs) <> 'array' or jsonb_array_length(p_legs) not between 1 and 2 then
    raise exception 'One or two journey legs required' using errcode='22023';
  end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'Note too long' using errcode='22023'; end if;
  insert into public.trips(campus_id,organizer_id,accepts_items,note)
  values(v_campus,auth.uid(),coalesce(p_accepts_items,false),nullif(trim(p_note),'')) returning id into v_trip;
  for v_leg in select value from jsonb_array_elements(p_legs) loop
    v_order := v_order + 1;
    v_direction := v_leg->>'direction';
    v_origin := (v_leg->>'origin_zone_id')::uuid;
    v_destination := (v_leg->>'destination_zone_id')::uuid;
    v_departure := (v_leg->>'departure_at')::timestamptz;
    v_seats := (v_leg->>'seats_available')::smallint;
    v_fare := nullif(v_leg->>'fare_estimate','')::numeric(10,2);
    if v_order=1 then
      if v_direction <> 'outward' then raise exception 'First leg must be outward' using errcode='22023'; end if;
      v_outward_origin := v_origin;
      v_outward_destination := v_destination;
      v_outward_departure := v_departure;
    elsif v_direction <> 'return' or v_origin <> v_outward_destination
      or v_destination <> v_outward_origin or v_departure <= v_outward_departure then
      raise exception 'Invalid return leg' using errcode='22023';
    end if;
    if v_departure <= now() or v_departure > now() + interval '1 year' then
      raise exception 'Departure must be in the future' using errcode='22023';
    end if;
    if not exists(select 1 from public.location_zones z where z.id=v_origin and z.campus_id=v_campus and z.active)
       or not exists(select 1 from public.location_zones z where z.id=v_destination and z.campus_id=v_campus and z.active) then
      raise exception 'Invalid location zone' using errcode='22023';
    end if;
    insert into public.journey_legs(trip_id,campus_id,direction,origin_zone_id,destination_zone_id,departure_at,seats_available,fare_estimate)
    values(v_trip,v_campus,v_direction,v_origin,v_destination,v_departure,v_seats,v_fare);
  end loop;
  return v_trip;
end $$;

create function public.request_join(p_leg_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_leg public.journey_legs%rowtype; v_trip public.trips%rowtype; v_id uuid;
begin
  if private.active_campus_id() is null then raise exception 'Account unavailable' using errcode='28000'; end if;
  select * into v_leg from public.journey_legs where id=p_leg_id for update;
  select * into v_trip from public.trips where id=v_leg.trip_id;
  if v_leg.id is null or v_trip.campus_id <> private.active_campus_id() or v_trip.organizer_id=auth.uid()
     or v_leg.status <> 'open' or v_trip.status <> 'open' or v_leg.departure_at <= now() then
    raise exception 'Journey unavailable' using errcode='22023';
  end if;
  if (select count(*) from public.leg_participants where leg_id=p_leg_id) >= v_leg.seats_available then
    raise exception 'Journey full' using errcode='22023';
  end if;
  insert into public.join_requests(leg_id,requester_id) values(p_leg_id,auth.uid())
  on conflict(leg_id,requester_id) do update set status='pending',updated_at=now()
    where join_requests.status='withdrawn'
  returning id into v_id;
  if v_id is null then raise exception 'Request already exists' using errcode='23505'; end if;
  return v_id;
end $$;

create function public.decide_join(p_request_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_request public.join_requests%rowtype; v_leg public.journey_legs%rowtype; v_trip public.trips%rowtype;
begin
  select * into v_request from public.join_requests where id=p_request_id;
  if v_request.id is null then raise exception 'Request unavailable' using errcode='22023'; end if;
  select * into v_leg from public.journey_legs where id=v_request.leg_id for update;
  select * into v_request from public.join_requests where id=p_request_id for update;
  select * into v_trip from public.trips where id=v_leg.trip_id;
  if v_trip.organizer_id <> auth.uid() or v_trip.campus_id <> private.active_campus_id()
     or v_trip.status <> 'open' or v_leg.status <> 'open' or v_leg.departure_at <= now()
     or v_request.status <> 'pending' then
    raise exception 'Request unavailable' using errcode='22023';
  end if;
  if p_accept then
    if (select count(*) from public.leg_participants where leg_id=v_leg.id) >= v_leg.seats_available then
      raise exception 'Journey full' using errcode='22023';
    end if;
    insert into public.leg_participants(leg_id,user_id,join_request_id)
    values(v_leg.id,v_request.requester_id,v_request.id);
    update public.join_requests set status='accepted',updated_at=now() where id=p_request_id;
  else
    update public.join_requests set status='rejected',updated_at=now() where id=p_request_id;
  end if;
end $$;

create function public.withdraw_join(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_request public.join_requests%rowtype; v_leg public.journey_legs%rowtype;
begin
  select * into v_request from public.join_requests where id=p_request_id;
  if v_request.id is null then raise exception 'Request unavailable' using errcode='22023'; end if;
  select * into v_leg from public.journey_legs where id=v_request.leg_id for update;
  select * into v_request from public.join_requests where id=p_request_id for update;
  if v_request.requester_id <> auth.uid() or private.active_campus_id() <> v_leg.campus_id
     or v_request.status not in ('pending','accepted') or v_leg.departure_at <= now() then
    raise exception 'Request unavailable' using errcode='22023';
  end if;
  delete from public.leg_participants where join_request_id=p_request_id;
  update public.join_requests set status='withdrawn',updated_at=now() where id=p_request_id;
end $$;

create function public.update_trip(p_trip_id uuid, p_expected_version integer, p_accepts_items boolean, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_trip public.trips%rowtype;
begin
  select * into v_trip from public.trips where id=p_trip_id for update;
  if v_trip.id is null or v_trip.organizer_id <> auth.uid() or v_trip.campus_id <> private.active_campus_id()
     or v_trip.status <> 'open' or v_trip.version <> p_expected_version then
    raise exception 'Trip unavailable or stale' using errcode='22023';
  end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'Note too long' using errcode='22023'; end if;
  update public.trips set accepts_items=coalesce(p_accepts_items,false),note=nullif(trim(p_note),''),
    version=version+1,updated_at=now() where id=p_trip_id;
end $$;

create function public.update_leg(p_leg_id uuid, p_departure_at timestamptz, p_seats_available smallint, p_fare_estimate numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare v_leg public.journey_legs%rowtype; v_trip public.trips%rowtype;
begin
  select * into v_leg from public.journey_legs where id=p_leg_id for update;
  select * into v_trip from public.trips where id=v_leg.trip_id;
  if v_leg.id is null or v_trip.organizer_id <> auth.uid() or v_trip.campus_id <> private.active_campus_id()
     or v_trip.status <> 'open' or v_leg.status <> 'open' or v_leg.departure_at <= now() then
    raise exception 'Journey unavailable' using errcode='22023';
  end if;
  if exists(select 1 from public.leg_participants where leg_id=p_leg_id) then
    raise exception 'Confirmed journey cannot be edited' using errcode='22023';
  end if;
  if p_departure_at <= now() or p_departure_at > now()+interval '1 year'
     or p_seats_available not between 1 and 8 or p_fare_estimate < 0 then
    raise exception 'Invalid journey details' using errcode='22023';
  end if;
  update public.journey_legs set departure_at=p_departure_at,seats_available=p_seats_available,fare_estimate=p_fare_estimate where id=p_leg_id;
end $$;

create function public.set_trip_status(p_trip_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_trip public.trips%rowtype;
begin
  select * into v_trip from public.trips where id=p_trip_id for update;
  if v_trip.id is null or v_trip.organizer_id <> auth.uid() or v_trip.campus_id <> private.active_campus_id()
     or v_trip.status <> 'open' or p_status not in ('cancelled','completed') then
    raise exception 'Trip unavailable' using errcode='22023';
  end if;
  update public.trips set status=p_status,version=version+1,updated_at=now() where id=p_trip_id;
  update public.journey_legs set status=p_status where trip_id=p_trip_id;
end $$;

revoke all on function public.create_trip(jsonb,boolean,text), public.request_join(uuid),
  public.decide_join(uuid,boolean), public.withdraw_join(uuid), public.update_trip(uuid,integer,boolean,text),
  public.update_leg(uuid,timestamptz,smallint,numeric), public.set_trip_status(uuid,text) from public, anon;
grant execute on function public.create_trip(jsonb,boolean,text), public.request_join(uuid),
  public.decide_join(uuid,boolean), public.withdraw_join(uuid), public.update_trip(uuid,integer,boolean,text),
  public.update_leg(uuid,timestamptz,smallint,numeric), public.set_trip_status(uuid,text) to authenticated;
