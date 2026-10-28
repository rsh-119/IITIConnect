create function public.create_item_request(p_zone_id uuid, p_description text, p_quantity integer,
  p_budget numeric, p_deadline timestamptz, p_product_url text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_campus uuid := private.active_campus_id(); v_id uuid;
begin
  if v_campus is null then raise exception 'Account unavailable' using errcode='28000'; end if;
  if not exists(select 1 from public.location_zones where id=p_zone_id and campus_id=v_campus and active)
     or char_length(trim(p_description)) not between 5 and 1000 or p_quantity not between 1 and 100
     or p_budget < 0 or p_budget > 100000 or p_deadline <= now()
     or p_deadline > now()+interval '1 year' then raise exception 'Invalid item request' using errcode='22023'; end if;
  if p_product_url is not null and (char_length(p_product_url)>2048 or p_product_url !~* '^https?://[^[:space:]]+$') then
    raise exception 'Invalid product link' using errcode='22023';
  end if;
  insert into public.item_requests(campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at,product_url)
  values(v_campus,auth.uid(),p_zone_id,trim(p_description),p_quantity,p_budget,p_deadline,nullif(trim(p_product_url),''))
  returning id into v_id;
  return v_id;
end $$;

create function public.offer_item(p_request_id uuid, p_leg_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_request public.item_requests%rowtype; v_leg public.journey_legs%rowtype; v_trip public.trips%rowtype; v_id uuid;
begin
  select * into v_request from public.item_requests where id=p_request_id for update;
  select * into v_leg from public.journey_legs where id=p_leg_id;
  select * into v_trip from public.trips where id=v_leg.trip_id;
  if v_request.id is null or v_request.campus_id <> private.active_campus_id() or v_request.requester_id=auth.uid()
     or v_request.status <> 'open' or v_request.deadline_at <= now() or v_leg.id is null
     or v_leg.campus_id <> v_request.campus_id or v_leg.status <> 'open' or v_leg.departure_at <= now()
     or v_leg.departure_at > v_request.deadline_at or v_trip.organizer_id <> auth.uid()
     or v_trip.status <> 'open' or not v_trip.accepts_items
     or (v_leg.direction='outward' and v_leg.destination_zone_id<>v_request.preferred_zone_id)
     or (v_leg.direction='return' and v_leg.origin_zone_id<>v_request.preferred_zone_id) then
    raise exception 'Offer unavailable' using errcode='22023';
  end if;
  insert into public.item_fulfilments(request_id,traveller_id,leg_id)
  values(p_request_id,auth.uid(),p_leg_id) returning id into v_id;
  return v_id;
end $$;

create function public.accept_item_offer(p_fulfilment_id uuid, p_description text, p_price numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare v_offer public.item_fulfilments%rowtype; v_request public.item_requests%rowtype;
begin
  select * into v_offer from public.item_fulfilments where id=p_fulfilment_id;
  if v_offer.id is null then raise exception 'Offer unavailable' using errcode='22023'; end if;
  select * into v_request from public.item_requests where id=v_offer.request_id for update;
  select * into v_offer from public.item_fulfilments where id=p_fulfilment_id for update;
  if v_request.requester_id <> auth.uid() or v_request.campus_id <> private.active_campus_id()
     or v_request.status <> 'open' or v_request.deadline_at <= now() or v_offer.status <> 'offered'
     or char_length(trim(p_description)) not between 5 and 1000
     or p_price < 0 or p_price > v_request.budget_limit then
    raise exception 'Offer unavailable' using errcode='22023';
  end if;
  update public.item_fulfilments set status='accepted',agreed_description=trim(p_description),agreed_price=p_price,updated_at=now()
  where id=p_fulfilment_id;
  update public.item_fulfilments set status='declined',updated_at=now()
  where request_id=v_request.id and id<>p_fulfilment_id and status='offered';
  update public.item_requests set status='agreed',updated_at=now() where id=v_request.id;
end $$;

create function public.set_item_status(p_request_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_request public.item_requests%rowtype; v_offer public.item_fulfilments%rowtype;
begin
  select * into v_request from public.item_requests where id=p_request_id for update;
  if v_request.id is null or v_request.campus_id <> private.active_campus_id() then
    raise exception 'Request unavailable' using errcode='22023'; end if;
  select * into v_offer from public.item_fulfilments where request_id=p_request_id
    and status in ('accepted','purchased','ready','disputed') for update;
  if p_status='cancelled' and v_request.requester_id=auth.uid() and v_request.status in ('open','agreed')
     and (v_offer.id is null or v_offer.status='accepted') then
    update public.item_requests set status='cancelled',updated_at=now() where id=p_request_id;
    update public.item_fulfilments set status='cancelled',updated_at=now() where request_id=p_request_id and status in ('offered','accepted');
  elsif p_status='purchased' and v_offer.traveller_id=auth.uid() and v_offer.status='accepted' and v_request.status='agreed' then
    update public.item_fulfilments set status='purchased',updated_at=now() where id=v_offer.id;
    update public.item_requests set status='purchased',updated_at=now() where id=p_request_id;
  elsif p_status='ready' and v_offer.traveller_id=auth.uid() and v_offer.status='purchased' and v_request.status='purchased' then
    update public.item_fulfilments set status='ready',updated_at=now() where id=v_offer.id;
    update public.item_requests set status='ready',updated_at=now() where id=p_request_id;
  elsif p_status='completed' and v_request.requester_id=auth.uid() and v_offer.status='ready' then
    update public.item_fulfilments set status='completed',updated_at=now() where id=v_offer.id;
    update public.item_requests set status='completed',updated_at=now() where id=p_request_id;
  elsif p_status='disputed' and auth.uid() in (v_request.requester_id,v_offer.traveller_id)
     and v_request.status in ('agreed','purchased','ready') then
    update public.item_fulfilments set status='disputed',updated_at=now() where id=v_offer.id;
    update public.item_requests set status='disputed',updated_at=now() where id=p_request_id;
  else
    raise exception 'Invalid item transition' using errcode='22023';
  end if;
end $$;

revoke all on function public.create_item_request(uuid,text,integer,numeric,timestamptz,text),
  public.offer_item(uuid,uuid), public.accept_item_offer(uuid,text,numeric), public.set_item_status(uuid,text) from public, anon;
grant execute on function public.create_item_request(uuid,text,integer,numeric,timestamptz,text),
  public.offer_item(uuid,uuid), public.accept_item_offer(uuid,text,numeric), public.set_item_status(uuid,text) to authenticated;
