-- Count opens from compatible-trip suggestions without storing who clicked.
alter table public.daily_product_metrics drop constraint daily_product_metrics_event_check;
alter table public.daily_product_metrics add constraint daily_product_metrics_event_check
  check (event in (
    'trip_created', 'join_requested', 'join_accepted',
    'item_created', 'item_completed', 'trip_completed', 'match_opened'
  ));

create function public.record_match_open(p_leg_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_campus uuid := private.active_campus_id(); v_trip uuid;
begin
  if v_campus is null then raise exception 'Account unavailable' using errcode='28000'; end if;
  select t.id into v_trip
  from public.journey_legs l join public.trips t on t.id=l.trip_id
  where l.id=p_leg_id and l.campus_id=v_campus and t.campus_id=v_campus
    and l.status='open' and t.status='open' and l.departure_at>now();
  if v_trip is null then raise exception 'Match unavailable' using errcode='22023'; end if;
  insert into public.daily_product_metrics(campus_id,day,event,count)
  values(v_campus,(now() at time zone 'UTC')::date,'match_opened',1)
  on conflict(campus_id,day,event) do update
    set count=public.daily_product_metrics.count+1;
  return v_trip;
end $$;
revoke all on function public.record_match_open(uuid) from public,anon;
grant execute on function public.record_match_open(uuid) to authenticated;
