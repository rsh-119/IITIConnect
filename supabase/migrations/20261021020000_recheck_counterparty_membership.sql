-- A pending request or offer does not reserve campus eligibility for its peer.
create function private.is_active_member(p_user_id uuid, p_campus_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.campuses c on c.id=p.campus_id
    join auth.users u on u.id=p.user_id
    join public.campus_domains d on d.campus_id=p.campus_id
      and d.domain=lower(split_part(u.email,'@',2))
    where p.user_id=p_user_id and p.campus_id=p_campus_id
      and p.status='active' and c.status='active'
      and u.email_confirmed_at is not null and d.enabled
  )
$$;
revoke all on function private.is_active_member(uuid,uuid) from public,anon,authenticated;

create or replace function public.decide_join(p_request_id uuid, p_accept boolean)
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
    perform 1 from public.profiles where user_id=v_request.requester_id for share;
    if not private.is_active_member(v_request.requester_id,v_trip.campus_id) then
      raise exception 'Applicant unavailable' using errcode='22023';
    end if;
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

create or replace function public.accept_item_offer(p_fulfilment_id uuid, p_description text, p_price numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_offer public.item_fulfilments%rowtype;
  v_request public.item_requests%rowtype;
  v_leg public.journey_legs%rowtype;
  v_trip public.trips%rowtype;
begin
  select * into v_offer from public.item_fulfilments where id=p_fulfilment_id;
  if v_offer.id is null then raise exception 'Offer unavailable' using errcode='22023'; end if;
  select * into v_request from public.item_requests where id=v_offer.request_id for update;
  select * into v_offer from public.item_fulfilments where id=p_fulfilment_id for update;
  select * into v_trip from public.trips
    where id=(select trip_id from public.journey_legs where id=v_offer.leg_id) for share;
  select * into v_leg from public.journey_legs where id=v_offer.leg_id for share;
  perform 1 from public.profiles where user_id=v_offer.traveller_id for share;
  if v_request.requester_id <> auth.uid() or v_request.campus_id <> private.active_campus_id()
     or v_request.status <> 'open' or v_request.deadline_at <= now() or v_offer.status <> 'offered'
     or v_trip.id is null or v_trip.campus_id <> v_request.campus_id
     or v_trip.organizer_id <> v_offer.traveller_id or v_trip.status <> 'open'
     or not private.is_active_member(v_offer.traveller_id,v_request.campus_id)
     or not v_trip.accepts_items or v_leg.status <> 'open' or v_leg.departure_at <= now()
     or v_leg.departure_at > v_request.deadline_at
     or p_description is null or char_length(trim(p_description)) not between 5 and 1000
     or p_price is null or p_price < 0 or p_price > v_request.budget_limit then
    raise exception 'Offer unavailable' using errcode='22023';
  end if;
  update public.item_fulfilments set status='accepted',agreed_description=trim(p_description),agreed_price=p_price,updated_at=now()
  where id=p_fulfilment_id;
  update public.item_fulfilments set status='declined',updated_at=now()
  where request_id=v_request.id and id<>p_fulfilment_id and status='offered';
  update public.item_requests set status='agreed',updated_at=now() where id=v_request.id;
end $$;
