-- An offer must still have a usable journey when the requester accepts it.
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
  if v_request.requester_id <> auth.uid() or v_request.campus_id <> private.active_campus_id()
     or v_request.status <> 'open' or v_request.deadline_at <= now() or v_offer.status <> 'offered'
     or v_trip.id is null or v_trip.campus_id <> v_request.campus_id
     or v_trip.organizer_id <> v_offer.traveller_id or v_trip.status <> 'open'
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
