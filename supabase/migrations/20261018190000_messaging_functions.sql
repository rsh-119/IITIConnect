create function public.open_conversation(p_context_kind text, p_context_id uuid)
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
    where f.id=p_context_id and f.status in ('offered','accepted','purchased','ready','disputed');
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

create function public.send_message(p_conversation_id uuid, p_body text, p_client_nonce uuid)
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
    select exists(select 1 from public.item_fulfilments where id=v_conversation.context_id and status in ('offered','accepted','purchased','ready','disputed')) into v_eligible;
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

create function public.mark_conversation_read(p_conversation_id uuid, p_message_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_conversation public.conversations%rowtype;
begin
  select * into v_conversation from public.conversations where id=p_conversation_id;
  if v_conversation.id is null or v_conversation.campus_id <> private.active_campus_id()
     or auth.uid() not in (v_conversation.member_a,v_conversation.member_b)
     or not exists(select 1 from public.messages where id=p_message_id and conversation_id=p_conversation_id) then
    raise exception 'Conversation unavailable' using errcode='22023';
  end if;
  insert into public.conversation_reads(conversation_id,user_id,last_read_message_id)
  values(p_conversation_id,auth.uid(),p_message_id)
  on conflict(conversation_id,user_id) do update set last_read_message_id=greatest(conversation_reads.last_read_message_id,excluded.last_read_message_id),updated_at=now();
end $$;

revoke all on function public.open_conversation(text,uuid), public.send_message(uuid,text,uuid),
  public.mark_conversation_read(uuid,bigint) from public, anon;
grant execute on function public.open_conversation(text,uuid), public.send_message(uuid,text,uuid),
  public.mark_conversation_read(uuid,bigint) to authenticated;
