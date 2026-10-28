alter table public.push_subscriptions add column updated_at timestamptz not null default now();

create function public.save_push_subscription(
  p_endpoint text,p_p256dh text,p_auth_secret text
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_existing uuid;
begin
  if private.active_campus_id() is null then
    raise exception 'Account unavailable' using errcode='28000';
  end if;
  if p_endpoint !~ '^https://[^[:space:]]+$' or char_length(p_endpoint)>2048
     or p_p256dh !~ '^[A-Za-z0-9_-]{80,120}$'
     or p_auth_secret !~ '^[A-Za-z0-9_-]{16,40}$' then
    raise exception 'Invalid subscription' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,0));
  select user_id into v_existing from public.push_subscriptions
    where endpoint=p_endpoint for update;
  if found and v_existing<>v_user then
    raise exception 'Subscription unavailable' using errcode='22023';
  end if;
  if not found and (
    select count(*) from public.push_subscriptions
    where user_id=v_user and status='active'
  )>=3 then
    raise exception 'Subscription limit reached' using errcode='P0001';
  end if;
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth_secret,status)
  values(v_user,p_endpoint,p_p256dh,p_auth_secret,'active')
  on conflict(endpoint) do update set
    p256dh=excluded.p256dh,auth_secret=excluded.auth_secret,
    status='active',updated_at=now();
  update public.profiles set notification_preferences=
    jsonb_set(notification_preferences,'{push}','true'::jsonb,true)
    where user_id=v_user;
end $$;
revoke all on function public.save_push_subscription(text,text,text) from public,anon;
grant execute on function public.save_push_subscription(text,text,text) to authenticated;

create function public.remove_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if private.active_campus_id() is null then
    raise exception 'Account unavailable' using errcode='28000';
  end if;
  delete from public.push_subscriptions
    where endpoint=p_endpoint and user_id=v_user;
  if not exists (
    select 1 from public.push_subscriptions
    where user_id=v_user and status='active'
  ) then
    update public.profiles set notification_preferences=
      jsonb_set(notification_preferences,'{push}','false'::jsonb,true)
      where user_id=v_user;
  end if;
end $$;
revoke all on function public.remove_push_subscription(text) from public,anon;
grant execute on function public.remove_push_subscription(text) to authenticated;
