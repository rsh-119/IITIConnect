-- Moderators may maintain campus zones without disrupting active workflows.
drop policy zones_read on public.location_zones;
create policy zones_read on public.location_zones for select to authenticated using (
  campus_id = (select private.active_campus_id())
  and (active or (select private.is_moderator()))
);

create function private.require_active_zone() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_TABLE_NAME = 'journey_legs' then
    perform 1 from public.location_zones
      where id = NEW.origin_zone_id and campus_id = NEW.campus_id and active for share;
    if not found then raise exception 'Origin zone unavailable' using errcode='22023'; end if;
    perform 1 from public.location_zones
      where id = NEW.destination_zone_id and campus_id = NEW.campus_id and active for share;
    if not found then raise exception 'Destination zone unavailable' using errcode='22023'; end if;
  else
    perform 1 from public.location_zones
      where id = NEW.preferred_zone_id and campus_id = NEW.campus_id and active for share;
    if not found then raise exception 'Purchase zone unavailable' using errcode='22023'; end if;
  end if;
  return NEW;
end $$;
create trigger require_trip_zones before insert or update of origin_zone_id,destination_zone_id
  on public.journey_legs for each row execute function private.require_active_zone();
create trigger require_item_zone before insert or update of preferred_zone_id
  on public.item_requests for each row execute function private.require_active_zone();
revoke all on function private.require_active_zone() from public, anon, authenticated;

create table public.campus_management_actions (
  id bigint generated always as identity primary key,
  campus_id uuid not null references public.campuses(id),
  actor_id uuid not null references public.profiles(user_id),
  zone_id uuid not null references public.location_zones(id),
  active boolean not null,
  reason text not null check (char_length(reason) between 10 and 1000),
  created_at timestamptz not null default now()
);
create index campus_management_actions_campus_idx
  on public.campus_management_actions(campus_id, created_at desc);
alter table public.campus_management_actions enable row level security;
revoke all on public.campus_management_actions from anon, authenticated;
grant select on public.campus_management_actions to authenticated;
create policy campus_management_read on public.campus_management_actions
  for select to authenticated using (
    (select private.is_moderator()) and campus_id = (select private.active_campus_id())
  );

create function public.set_zone_active(p_zone_id uuid, p_active boolean, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_zone public.location_zones%rowtype;
begin
  if not private.is_moderator() or p_active is null
    or char_length(trim(coalesce(p_reason, ''))) not between 10 and 1000 then
    raise exception 'Zone change unavailable' using errcode='28000';
  end if;
  select * into v_zone from public.location_zones where id=p_zone_id for update;
  if v_zone.id is null or v_zone.campus_id <> private.active_campus_id()
    or v_zone.active = p_active then
    raise exception 'Zone change unavailable' using errcode='22023';
  end if;
  if not p_active and (
    exists (select 1 from public.journey_legs l join public.trips t on t.id=l.trip_id
      where l.campus_id=v_zone.campus_id and l.status='open' and t.status='open'
      and (l.origin_zone_id=p_zone_id or l.destination_zone_id=p_zone_id))
    or exists (select 1 from public.item_requests r
      where r.campus_id=v_zone.campus_id and r.preferred_zone_id=p_zone_id
      and r.status in ('open','agreed','purchased','ready','disputed'))
  ) then
    raise exception 'Zone has active workflows' using errcode='22023';
  end if;
  update public.location_zones set active=p_active where id=p_zone_id;
  insert into public.campus_management_actions(campus_id,actor_id,zone_id,active,reason)
  values(v_zone.campus_id,auth.uid(),p_zone_id,p_active,trim(p_reason));
end $$;
revoke all on function public.set_zone_active(uuid,boolean,text) from public,anon;
grant execute on function public.set_zone_active(uuid,boolean,text) to authenticated;
