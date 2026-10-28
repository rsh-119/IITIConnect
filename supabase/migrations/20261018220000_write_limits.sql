-- Conservative per-member limits. Auth signup/email limits remain Supabase configuration.
create index trips_creator_rate_idx on public.trips(organizer_id,created_at desc);
create index items_creator_rate_idx on public.item_requests(requester_id,created_at desc);
create index joins_creator_rate_idx on public.join_requests(requester_id,created_at desc);
create index offers_creator_rate_idx on public.item_fulfilments(traveller_id,created_at desc);
create index messages_creator_rate_idx on public.messages(sender_id,created_at desc);
create index reports_creator_rate_idx on public.reports(reporter_id,created_at desc);

create function private.enforce_member_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_user uuid := auth.uid();
begin
  if v_user is null then return new; end if;
  if private.active_campus_id() is null then raise exception 'Account unavailable' using errcode='28000'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,0));
  if tg_table_name='trips' then
    if new.organizer_id<>v_user then raise exception 'Wrong owner' using errcode='28000'; end if;
    select count(*) into v_count from public.trips where organizer_id=v_user and created_at>now()-interval '1 day';
    if v_count>=10 then raise exception 'Trip limit reached' using errcode='P0001'; end if;
  elsif tg_table_name='item_requests' then
    if new.requester_id<>v_user then raise exception 'Wrong owner' using errcode='28000'; end if;
    select count(*) into v_count from public.item_requests where requester_id=v_user and created_at>now()-interval '1 day';
    if v_count>=20 then raise exception 'Item limit reached' using errcode='P0001'; end if;
  elsif tg_table_name='join_requests' then
    if new.requester_id<>v_user then raise exception 'Wrong owner' using errcode='28000'; end if;
    select count(*) into v_count from public.join_requests where requester_id=v_user and created_at>now()-interval '1 day';
    if v_count>=20 then raise exception 'Join limit reached' using errcode='P0001'; end if;
  elsif tg_table_name='item_fulfilments' then
    if new.traveller_id<>v_user then raise exception 'Wrong owner' using errcode='28000'; end if;
    select count(*) into v_count from public.item_fulfilments where traveller_id=v_user and created_at>now()-interval '1 day';
    if v_count>=20 then raise exception 'Offer limit reached' using errcode='P0001'; end if;
  elsif tg_table_name='messages' then
    if new.sender_id<>v_user then raise exception 'Wrong owner' using errcode='28000'; end if;
    select count(*) into v_count from public.messages where sender_id=v_user and created_at>now()-interval '1 minute';
    if v_count>=30 then raise exception 'Message limit reached' using errcode='P0001'; end if;
  elsif tg_table_name='reports' then
    if new.reporter_id<>v_user then raise exception 'Wrong owner' using errcode='28000'; end if;
    select count(*) into v_count from public.reports where reporter_id=v_user and created_at>now()-interval '1 day';
    if v_count>=10 then raise exception 'Report limit reached' using errcode='P0001'; end if;
  end if;
  return new;
end $$;
revoke all on function private.enforce_member_rate() from public,anon,authenticated;
create trigger trip_write_limit before insert on public.trips for each row execute function private.enforce_member_rate();
create trigger item_write_limit before insert on public.item_requests for each row execute function private.enforce_member_rate();
create trigger join_write_limit before insert on public.join_requests for each row execute function private.enforce_member_rate();
create trigger offer_write_limit before insert on public.item_fulfilments for each row execute function private.enforce_member_rate();
create trigger message_write_limit before insert on public.messages for each row execute function private.enforce_member_rate();
create trigger report_write_limit before insert on public.reports for each row execute function private.enforce_member_rate();
