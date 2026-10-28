alter table public.item_requests add column version integer not null default 1 check (version > 0);

create function public.update_item_request(p_request_id uuid,p_expected_version integer,p_zone_id uuid,
  p_description text,p_quantity integer,p_budget numeric,p_deadline timestamptz,p_product_url text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_request public.item_requests%rowtype;
begin
  select * into v_request from public.item_requests where id=p_request_id for update;
  if v_request.id is null or v_request.requester_id<>auth.uid() or v_request.campus_id<>private.active_campus_id()
     or v_request.status<>'open' or v_request.version<>p_expected_version
     or exists(select 1 from public.item_fulfilments where request_id=p_request_id and status='offered')
     or not exists(select 1 from public.location_zones where id=p_zone_id and campus_id=v_request.campus_id and active)
     or char_length(trim(p_description)) not between 5 and 1000 or p_quantity not between 1 and 100
     or p_budget<0 or p_budget>100000 or p_deadline<=now() or p_deadline>now()+interval '1 year'
     or (p_product_url is not null and (char_length(p_product_url)>2048 or p_product_url !~* '^https?://[^[:space:]]+$')) then
    raise exception 'Request unavailable or invalid' using errcode='22023';
  end if;
  update public.item_requests set preferred_zone_id=p_zone_id,description=trim(p_description),quantity=p_quantity,
    budget_limit=p_budget,deadline_at=p_deadline,product_url=nullif(trim(p_product_url),''),version=version+1,updated_at=now()
  where id=p_request_id;
end $$;

create function public.decline_item_offer(p_fulfilment_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_offer public.item_fulfilments%rowtype; v_request public.item_requests%rowtype;
begin
  select * into v_offer from public.item_fulfilments where id=p_fulfilment_id;
  if v_offer.id is null then raise exception 'Offer unavailable' using errcode='22023'; end if;
  select * into v_request from public.item_requests where id=v_offer.request_id for update;
  if v_request.requester_id<>auth.uid() or v_request.campus_id<>private.active_campus_id()
    or v_request.status<>'open' or v_offer.status<>'offered' then
    raise exception 'Offer unavailable' using errcode='22023'; end if;
  update public.item_fulfilments set status='declined',updated_at=now() where id=p_fulfilment_id;
end $$;

revoke all on function public.update_item_request(uuid,integer,uuid,text,integer,numeric,timestamptz,text),
  public.decline_item_offer(uuid) from public,anon;
grant execute on function public.update_item_request(uuid,integer,uuid,text,integer,numeric,timestamptz,text),
  public.decline_item_offer(uuid) to authenticated;
