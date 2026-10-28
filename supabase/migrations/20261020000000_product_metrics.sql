-- Transactional, campus-level counts. No member, post, or device identifiers are stored.
create table public.daily_product_metrics (
  campus_id uuid not null references public.campuses(id),
  day date not null,
  event text not null check (event in (
    'trip_created', 'join_requested', 'join_accepted',
    'item_created', 'item_completed', 'trip_completed'
  )),
  count bigint not null default 0 check (count >= 0),
  primary key (campus_id, day, event)
);
alter table public.daily_product_metrics enable row level security;
revoke all on public.daily_product_metrics from anon, authenticated;
grant select on public.daily_product_metrics to authenticated;
create policy product_metrics_moderator_read on public.daily_product_metrics
  for select to authenticated using (
    (select private.is_moderator()) and campus_id = (select private.active_campus_id())
  );

create function private.count_product_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_campus uuid; v_event text;
begin
  if TG_TABLE_NAME = 'trips' then
    v_campus := NEW.campus_id;
    if TG_OP = 'INSERT' then v_event := 'trip_created';
    elsif OLD.status <> 'completed' and NEW.status = 'completed' then v_event := 'trip_completed';
    end if;
  elsif TG_TABLE_NAME = 'join_requests' then
    select campus_id into v_campus from public.journey_legs where id = NEW.leg_id;
    if TG_OP = 'INSERT' then v_event := 'join_requested';
    elsif OLD.status <> 'accepted' and NEW.status = 'accepted' then v_event := 'join_accepted';
    end if;
  elsif TG_TABLE_NAME = 'item_requests' then
    v_campus := NEW.campus_id;
    if TG_OP = 'INSERT' then v_event := 'item_created';
    elsif OLD.status <> 'completed' and NEW.status = 'completed' then v_event := 'item_completed';
    end if;
  end if;
  if v_event is not null then
    insert into public.daily_product_metrics(campus_id, day, event, count)
    values (v_campus, (now() at time zone 'UTC')::date, v_event, 1)
    on conflict (campus_id, day, event) do update
      set count = public.daily_product_metrics.count + 1;
  end if;
  return NEW;
end $$;

create trigger count_trip_create after insert on public.trips
  for each row execute function private.count_product_event();
create trigger count_trip_complete after update of status on public.trips
  for each row execute function private.count_product_event();
create trigger count_join_create after insert on public.join_requests
  for each row execute function private.count_product_event();
create trigger count_join_accept after update of status on public.join_requests
  for each row execute function private.count_product_event();
create trigger count_item_create after insert on public.item_requests
  for each row execute function private.count_product_event();
create trigger count_item_complete after update of status on public.item_requests
  for each row execute function private.count_product_event();

revoke all on function private.count_product_event() from public, anon, authenticated;
