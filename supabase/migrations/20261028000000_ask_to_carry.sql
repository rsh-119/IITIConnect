-- Owner decision (2026-10-28): items are no longer posted for any traveller.
-- A student asks the organizer of a trip that accepts items to bring one; the
-- traveller accepts or declines. An ask is an item request plus an 'asked'
-- fulfilment, so the existing handover states and old offer data keep working.

alter table public.item_fulfilments drop constraint item_fulfilments_status_check;
alter table public.item_fulfilments add constraint item_fulfilments_status_check check (status in
  ('asked','offered','declined','accepted','purchased','ready','completed','cancelled','disputed'));

-- The ask is rate limited through its item_requests row (owned by the requester).
drop trigger offer_write_limit on public.item_fulfilments;
create trigger offer_write_limit before insert on public.item_fulfilments
  for each row when (new.status <> 'asked') execute function private.enforce_member_rate();

create function public.ask_to_carry(p_leg_id uuid, p_description text, p_quantity integer, p_budget numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_campus uuid := private.active_campus_id(); v_leg public.journey_legs%rowtype;
  v_trip public.trips%rowtype; v_id uuid;
begin
  if v_campus is null then raise exception 'Account unavailable' using errcode='28000'; end if;
  select * into v_trip from public.trips
    where id=(select trip_id from public.journey_legs where id=p_leg_id) for share;
  select * into v_leg from public.journey_legs where id=p_leg_id for share;
  perform 1 from public.profiles where user_id=v_trip.organizer_id for share;
  if v_leg.id is null or v_trip.campus_id <> v_campus or v_trip.organizer_id = auth.uid()
     or v_trip.status <> 'open' or not v_trip.accepts_items
     or v_leg.status <> 'open' or v_leg.departure_at <= now()
     or not private.is_active_member(v_trip.organizer_id, v_campus)
     or exists(select 1 from public.blocks where (blocker_id=auth.uid() and blocked_id=v_trip.organizer_id)
                                             or (blocker_id=v_trip.organizer_id and blocked_id=auth.uid()))
     or p_description is null or char_length(trim(p_description)) not between 5 and 1000
     or p_quantity is null or p_quantity not between 1 and 100
     or p_budget is null or p_budget < 0 or p_budget > 100000 then
    raise exception 'Trip unavailable' using errcode='22023';
  end if;
  insert into public.item_requests(campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at)
  values (v_campus, auth.uid(),
    case when v_leg.direction='return' then v_leg.origin_zone_id else v_leg.destination_zone_id end,
    trim(p_description), p_quantity, p_budget, v_leg.departure_at)
  returning id into v_id;
  insert into public.item_fulfilments(request_id,traveller_id,leg_id,status)
  values (v_id, v_trip.organizer_id, p_leg_id, 'asked');
  return v_id;
end $$;

create function public.answer_carry_request(p_fulfilment_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_offer public.item_fulfilments%rowtype; v_request public.item_requests%rowtype;
  v_trip public.trips%rowtype; v_leg public.journey_legs%rowtype;
begin
  select * into v_offer from public.item_fulfilments where id=p_fulfilment_id;
  if v_offer.id is null then raise exception 'Request unavailable' using errcode='22023'; end if;
  select * into v_trip from public.trips
    where id=(select trip_id from public.journey_legs where id=v_offer.leg_id) for share;
  select * into v_leg from public.journey_legs where id=v_offer.leg_id for share;
  select * into v_request from public.item_requests where id=v_offer.request_id for update;
  select * into v_offer from public.item_fulfilments where id=p_fulfilment_id for update;
  if p_accept is null or v_offer.traveller_id <> auth.uid() or v_offer.status <> 'asked'
     or v_request.campus_id <> private.active_campus_id() or v_request.status <> 'open' then
    raise exception 'Request unavailable' using errcode='22023';
  end if;
  if p_accept then
    perform 1 from public.profiles where user_id=v_request.requester_id for share;
    if v_trip.status <> 'open' or v_leg.status <> 'open' or v_leg.departure_at <= now()
       or not private.is_active_member(v_request.requester_id, v_request.campus_id)
       or exists(select 1 from public.blocks where (blocker_id=auth.uid() and blocked_id=v_request.requester_id)
                                               or (blocker_id=v_request.requester_id and blocked_id=auth.uid())) then
      raise exception 'Request unavailable' using errcode='22023';
    end if;
    update public.item_fulfilments set status='accepted', agreed_description=v_request.description,
      agreed_price=v_request.budget_limit, updated_at=now() where id=p_fulfilment_id;
    update public.item_requests set status='agreed', updated_at=now() where id=v_request.id;
  else
    update public.item_fulfilments set status='declined', updated_at=now() where id=p_fulfilment_id;
    update public.item_requests set status='cancelled', updated_at=now() where id=v_request.id;
  end if;
end $$;

revoke all on function public.ask_to_carry(uuid,text,integer,numeric), public.answer_carry_request(uuid,boolean) from public, anon;
grant execute on function public.ask_to_carry(uuid,text,integer,numeric), public.answer_carry_request(uuid,boolean) to authenticated;

-- Asks notify the traveller; answers notify the requester. Offer branches unchanged.
create or replace function private.notify_workflow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_recipient uuid; v_kind text; v_entity uuid; v_key text;
begin
  if tg_table_name = 'join_requests' then
    if tg_op = 'INSERT' then
      select t.organizer_id into v_recipient from public.journey_legs l join public.trips t on t.id=l.trip_id where l.id=new.leg_id;
      v_kind := 'join_request';
      v_key := 'join:' || new.id || ':created';
    elsif new.status is distinct from old.status and new.status in ('accepted','rejected') then
      v_recipient := new.requester_id;
      v_kind := 'join_' || new.status;
      v_key := 'join:' || new.id || ':' || new.status;
    end if;
    v_entity := new.id;
  elsif tg_table_name = 'item_fulfilments' then
    if tg_op = 'INSERT' and new.status = 'asked' then
      v_recipient := new.traveller_id;
      v_kind := 'item_asked';
      v_key := 'ask:' || new.id || ':created';
    elsif tg_op = 'INSERT' then
      select requester_id into v_recipient from public.item_requests where id=new.request_id;
      v_kind := 'item_offer';
      v_key := 'offer:' || new.id || ':created';
    elsif new.status is distinct from old.status and old.status = 'asked' and new.status in ('accepted','declined') then
      select requester_id into v_recipient from public.item_requests where id=new.request_id;
      v_kind := case new.status when 'accepted' then 'item_ask_accepted' else 'item_ask_declined' end;
      v_key := 'ask:' || new.id || ':' || new.status;
    elsif new.status is distinct from old.status and new.status = 'accepted' then
      v_recipient := new.traveller_id;
      v_kind := 'item_accepted';
      v_key := 'offer:' || new.id || ':accepted';
    end if;
    v_entity := new.request_id;
  elsif tg_table_name = 'messages' then
    select case when c.member_a=new.sender_id then c.member_b else c.member_a end
      into v_recipient from public.conversations c where c.id=new.conversation_id;
    v_kind := 'message';
    v_entity := new.conversation_id;
    v_key := 'message:' || new.id;
  elsif tg_table_name = 'trips' and new.status = 'cancelled' and old.status is distinct from new.status then
    insert into public.notifications(recipient_id,kind,entity_id,dedupe_key)
    select distinct r.requester_id,'trip_cancelled',new.id,'trip:' || new.id || ':cancelled'
    from public.join_requests r join public.journey_legs l on l.id=r.leg_id
    join public.profiles p on p.user_id=r.requester_id
    where l.trip_id=new.id and r.status='accepted' and p.status='active'
      and coalesce((p.notification_preferences->>'inApp')::boolean,true)
    on conflict(recipient_id,dedupe_key) do nothing;
    return new;
  end if;
  if v_recipient is not null and v_recipient is distinct from auth.uid() then
    insert into public.notifications(recipient_id,kind,entity_id,dedupe_key)
    select v_recipient,v_kind,v_entity,v_key from public.profiles p
    where p.user_id=v_recipient and p.status='active'
      and coalesce((p.notification_preferences->>'inApp')::boolean,true)
    on conflict(recipient_id,dedupe_key) do nothing;
  end if;
  return new;
end $$;

-- A pending ask can be discussed while its request is still open.
create or replace function public.open_conversation(p_context_kind text, p_context_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_a uuid; v_b uuid; v_campus uuid; v_id uuid;
begin
  if private.active_campus_id() is null then raise exception 'Account unavailable' using errcode='28000'; end if;
  if p_context_kind='join' then
    select r.requester_id,t.organizer_id,t.campus_id into v_a,v_b,v_campus
    from public.join_requests r join public.journey_legs l on l.id=r.leg_id
    join public.trips t on t.id=l.trip_id
    where r.id=p_context_id and r.status in ('pending','accepted');
  elsif p_context_kind='item' then
    select r.requester_id,f.traveller_id,r.campus_id into v_a,v_b,v_campus
    from public.item_fulfilments f join public.item_requests r on r.id=f.request_id
    where f.id=p_context_id and (f.status in ('offered','accepted','purchased','ready','disputed')
      or (f.status='asked' and r.status='open'));
  else raise exception 'Invalid conversation context' using errcode='22023'; end if;
  if v_a is null or v_b is null or v_campus <> private.active_campus_id()
     or auth.uid() not in (v_a,v_b)
     or exists(select 1 from public.blocks where (blocker_id=v_a and blocked_id=v_b) or (blocker_id=v_b and blocked_id=v_a)) then
    raise exception 'Conversation unavailable' using errcode='22023';
  end if;
  insert into public.conversations(campus_id,context_kind,context_id,member_a,member_b)
  values(v_campus,p_context_kind,p_context_id,v_a,v_b)
  on conflict(context_kind,context_id) do update set context_id=excluded.context_id
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.send_message(p_conversation_id uuid, p_body text, p_client_nonce uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_conversation public.conversations%rowtype; v_id bigint; v_eligible boolean;
begin
  select * into v_conversation from public.conversations where id=p_conversation_id;
  if v_conversation.id is null or v_conversation.campus_id <> private.active_campus_id()
     or auth.uid() not in (v_conversation.member_a,v_conversation.member_b)
     or char_length(trim(p_body)) not between 1 and 4000
     or p_client_nonce is null
     or exists(select 1 from public.blocks where
       (blocker_id=v_conversation.member_a and blocked_id=v_conversation.member_b)
       or (blocker_id=v_conversation.member_b and blocked_id=v_conversation.member_a)) then
    raise exception 'Message unavailable' using errcode='22023';
  end if;
  if v_conversation.context_kind='join' then
    select exists(select 1 from public.join_requests where id=v_conversation.context_id and status in ('pending','accepted')) into v_eligible;
  else
    select exists(select 1 from public.item_fulfilments f join public.item_requests r on r.id=f.request_id
      where f.id=v_conversation.context_id and (f.status in ('offered','accepted','purchased','ready','disputed')
        or (f.status='asked' and r.status='open'))) into v_eligible;
  end if;
  if not v_eligible then raise exception 'Conversation closed' using errcode='22023'; end if;
  select id into v_id from public.messages where sender_id=auth.uid() and client_nonce=p_client_nonce;
  if v_id is not null then
    if not exists(select 1 from public.messages where id=v_id and conversation_id=p_conversation_id) then
      raise exception 'Nonce already used' using errcode='23505';
    end if;
    return v_id;
  end if;
  insert into public.messages(conversation_id,sender_id,body,client_nonce)
  values(p_conversation_id,auth.uid(),trim(p_body),p_client_nonce)
  on conflict(sender_id,client_nonce) do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.messages where sender_id=auth.uid() and client_nonce=p_client_nonce
      and conversation_id=p_conversation_id;
    if v_id is null then raise exception 'Nonce already used' using errcode='23505'; end if;
  end if;
  return v_id;
end $$;

create or replace function private.expire_open_items() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.item_requests set status='expired',updated_at=now()
  where status='open' and deadline_at<=now();
  get diagnostics v_count = row_count;
  update public.item_fulfilments f set status='cancelled',updated_at=now()
  from public.item_requests r
  where f.request_id=r.id and r.status='expired' and f.status in ('offered','asked');
  return v_count;
end $$;

create or replace function public.set_item_status(p_request_id uuid, p_status text)
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
    update public.item_fulfilments set status='cancelled',updated_at=now() where request_id=p_request_id and status in ('offered','asked','accepted');
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

-- Ending a trip declines its pending asks (request first, then fulfilment).
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
  update public.item_requests r set status='cancelled', updated_at=now()
  from public.item_fulfilments f join public.journey_legs l on l.id=f.leg_id
  where f.request_id=r.id and f.status='asked' and l.trip_id=p_trip_id and r.status='open';
  update public.item_fulfilments f set status='declined', updated_at=now()
  from public.journey_legs l where l.id=f.leg_id and l.trip_id=p_trip_id and f.status='asked';
end $$;

-- Old paths must not compete with or rewrite a pending ask.
create or replace function public.offer_item(p_request_id uuid, p_leg_id uuid)
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
     or (v_leg.direction='return' and v_leg.origin_zone_id<>v_request.preferred_zone_id)
     or exists(select 1 from public.item_fulfilments where request_id=p_request_id and status='asked') then
    raise exception 'Offer unavailable' using errcode='22023';
  end if;
  insert into public.item_fulfilments(request_id,traveller_id,leg_id)
  values(p_request_id,auth.uid(),p_leg_id) returning id into v_id;
  return v_id;
end $$;

create or replace function public.update_item_request(p_request_id uuid,p_expected_version integer,p_zone_id uuid,
  p_description text,p_quantity integer,p_budget numeric,p_deadline timestamptz,p_product_url text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_request public.item_requests%rowtype;
begin
  select * into v_request from public.item_requests where id=p_request_id for update;
  if v_request.id is null or v_request.requester_id<>auth.uid() or v_request.campus_id<>private.active_campus_id()
     or v_request.status<>'open' or v_request.version<>p_expected_version
     or exists(select 1 from public.item_fulfilments where request_id=p_request_id and status in ('offered','asked'))
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
