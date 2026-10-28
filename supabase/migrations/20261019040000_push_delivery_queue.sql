create table public.push_deliveries (
  id bigint generated always as identity primary key,
  notification_id bigint not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','sent','invalid','failed','skipped')),
  attempts smallint not null default 0 check (attempts between 0 and 3),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(notification_id,subscription_id)
);
create index push_deliveries_queue_idx on public.push_deliveries(status,next_attempt_at,id);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from public,anon,authenticated;
grant all on public.push_deliveries to service_role;

create function private.enqueue_push_delivery() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.push_deliveries(notification_id,subscription_id)
  select new.id,s.id from public.push_subscriptions s
  join public.profiles p on p.user_id=s.user_id
  where s.user_id=new.recipient_id and s.status='active'
    and p.status='active'
    and coalesce((p.notification_preferences->>'push')::boolean,false)
  on conflict(notification_id,subscription_id) do nothing;
  return new;
end $$;
revoke all on function private.enqueue_push_delivery() from public,anon,authenticated;
create trigger notification_push_queue after insert on public.notifications
for each row execute function private.enqueue_push_delivery();

create function public.claim_push_deliveries(p_limit integer default 25)
returns table (
  delivery_id bigint,notification_id bigint,endpoint text,p256dh text,
  auth_secret text
)
language plpgsql security definer set search_path = '' as $$
begin
  if p_limit not between 1 and 50 then
    raise exception 'Invalid batch size' using errcode='22023';
  end if;
  update public.push_deliveries d set status='skipped'
  where d.status in ('pending','processing') and (
    not exists (
      select 1 from public.push_subscriptions s
      join public.profiles p on p.user_id=s.user_id
      where s.id=d.subscription_id and s.status='active' and p.status='active'
        and coalesce((p.notification_preferences->>'push')::boolean,false)
    )
  );
  update public.push_deliveries set status='failed'
  where status='processing' and attempts>=3
    and claimed_at<now()-interval '10 minutes';
  return query
  with selected as (
    select d.id from public.push_deliveries d
    where (d.status='pending' and d.next_attempt_at<=now())
       or (d.status='processing' and d.claimed_at<now()-interval '10 minutes')
    order by d.id limit p_limit for update skip locked
  ), claimed as (
    update public.push_deliveries d
    set status='processing',attempts=d.attempts+1,claimed_at=now()
    from selected where d.id=selected.id and d.attempts<3
    returning d.id,d.notification_id,d.subscription_id
  )
  select c.id,c.notification_id,s.endpoint,s.p256dh,s.auth_secret
  from claimed c join public.push_subscriptions s on s.id=c.subscription_id;
end $$;
revoke all on function public.claim_push_deliveries(integer) from public,anon,authenticated;
grant execute on function public.claim_push_deliveries(integer) to service_role;

create function public.finish_push_delivery(p_delivery_id bigint,p_outcome text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_delivery public.push_deliveries%rowtype;
begin
  if p_outcome not in ('sent','invalid','retry') then
    raise exception 'Invalid outcome' using errcode='22023';
  end if;
  select * into v_delivery from public.push_deliveries
  where id=p_delivery_id and status='processing' for update;
  if not found then raise exception 'Delivery unavailable' using errcode='22023'; end if;
  if p_outcome='sent' then
    update public.push_deliveries set status='sent',sent_at=now() where id=p_delivery_id;
  elsif p_outcome='invalid' then
    update public.push_subscriptions set status='invalid',updated_at=now()
      where id=v_delivery.subscription_id;
    update public.push_deliveries set status='invalid' where id=p_delivery_id;
  elsif v_delivery.attempts>=3 then
    update public.push_deliveries set status='failed' where id=p_delivery_id;
  else
    update public.push_deliveries
      set status='pending',next_attempt_at=now()+(v_delivery.attempts*interval '5 minutes')
      where id=p_delivery_id;
  end if;
end $$;
revoke all on function public.finish_push_delivery(bigint,text) from public,anon,authenticated;
grant execute on function public.finish_push_delivery(bigint,text) to service_role;
