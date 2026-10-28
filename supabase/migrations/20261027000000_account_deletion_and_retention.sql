-- Owner decisions (2026-10-27): members can anonymize their own account, and
-- finished trips, items, chats and notifications are purged after 90 days.

-- Ends the member's open activity through the existing workflow RPCs, removes
-- personal-only rows and leaves an anonymous profile so shared history keeps its
-- references. Returns linked image paths for the server to remove from Storage.
-- ponytail: accepted/purchased item handovers are left for the counterparty to
-- complete or dispute; add a forced cancel if moderators need it.
create function public.delete_own_account() returns text[]
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid; v_images text[];
begin
  if v_user is null or private.active_campus_id() is null then
    raise exception 'Account unavailable' using errcode='28000';
  end if;
  for v_id in select id from public.trips where organizer_id=v_user and status='open' loop
    perform public.set_trip_status(v_id,'cancelled');
  end loop;
  for v_id in select r.id from public.join_requests r join public.journey_legs l on l.id=r.leg_id
    where r.requester_id=v_user and r.status in ('pending','accepted') and l.departure_at>now() loop
    perform public.withdraw_join(v_id);
  end loop;
  for v_id in select r.id from public.item_requests r
    where r.requester_id=v_user and r.status in ('open','agreed')
      and not exists(select 1 from public.item_fulfilments f
        where f.request_id=r.id and f.status in ('purchased','ready','disputed')) loop
    perform public.set_item_status(v_id,'cancelled');
  end loop;
  update public.item_fulfilments set status='cancelled',updated_at=now()
  where traveller_id=v_user and status='offered';

  select coalesce(array_agg(image_path),'{}') into v_images
  from public.item_requests where requester_id=v_user and image_path is not null;
  update public.item_requests set image_path=null where requester_id=v_user and image_path is not null;
  delete from public.push_subscriptions where user_id=v_user;
  delete from public.notifications where recipient_id=v_user;
  delete from public.blocks where blocker_id=v_user or blocked_id=v_user;
  update public.profiles set display_name='Deleted member',status='deleted',role='member',
    notification_preferences='{}'::jsonb,updated_at=now()
  where user_id=v_user;
  return v_images;
end $$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- Deletes finished content older than the cutoff. Disputed and in-progress items,
-- trips still supporting a retained item offer, and anonymous profiles are kept.
-- Returns removed image paths for the server to delete from Storage.
create function public.purge_expired_content(p_cutoff timestamptz default now() - interval '90 days')
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_items uuid[]; v_trips uuid[]; v_joins uuid[]; v_convs uuid[]; v_images text[];
begin
  if p_cutoff > now() - interval '90 days' then
    raise exception 'Retention cutoff too recent' using errcode='22023';
  end if;

  select coalesce(array_agg(id),'{}'), coalesce(array_agg(image_path) filter (where image_path is not null),'{}')
  into v_items, v_images from public.item_requests
  where status in ('completed','cancelled','expired') and updated_at<p_cutoff;
  select coalesce(array_agg(id),'{}') into v_convs from public.conversations
  where context_kind='item' and context_id in (select id from public.item_fulfilments where request_id=any(v_items));
  delete from public.conversation_reads where conversation_id=any(v_convs);
  delete from public.messages where conversation_id=any(v_convs);
  delete from public.conversations where id=any(v_convs);
  delete from public.item_fulfilments where request_id=any(v_items);
  delete from public.item_requests where id=any(v_items);

  select coalesce(array_agg(t.id),'{}') into v_trips from public.trips t
  where t.status in ('completed','cancelled','expired') and t.updated_at<p_cutoff
    and not exists(select 1 from public.journey_legs l where l.trip_id=t.id and l.departure_at>=p_cutoff)
    and not exists(select 1 from public.journey_legs l join public.item_fulfilments f on f.leg_id=l.id where l.trip_id=t.id);
  select coalesce(array_agg(r.id),'{}') into v_joins from public.join_requests r
  join public.journey_legs l on l.id=r.leg_id where l.trip_id=any(v_trips);
  select coalesce(array_agg(id),'{}') into v_convs from public.conversations
  where context_kind='join' and context_id=any(v_joins);
  delete from public.conversation_reads where conversation_id=any(v_convs);
  delete from public.messages where conversation_id=any(v_convs);
  delete from public.conversations where id=any(v_convs);
  delete from public.leg_participants where join_request_id=any(v_joins);
  delete from public.join_requests where id=any(v_joins);
  delete from public.journey_legs where trip_id=any(v_trips);
  delete from public.trips where id=any(v_trips);

  delete from public.notifications where created_at<p_cutoff;
  delete from public.push_subscriptions where status='invalid';
  -- Closed moderation records are kept for a year.
  delete from public.moderation_actions m where m.created_at<now()-interval '1 year'
    and (m.report_id is null or exists(select 1 from public.reports r where r.id=m.report_id and r.status<>'open'));
  delete from public.reports r where r.status<>'open' and r.created_at<now()-interval '1 year'
    and not exists(select 1 from public.moderation_actions m where m.report_id=r.id);
  return v_images;
end $$;
revoke all on function public.purge_expired_content(timestamptz) from public, anon, authenticated;
grant execute on function public.purge_expired_content(timestamptz) to service_role;
