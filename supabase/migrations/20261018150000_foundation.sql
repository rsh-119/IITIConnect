-- New-project schema. Apply through Supabase migrations, never to a shared DB without review.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now()
);

create table public.campus_domains (
  domain text primary key check (domain = lower(domain)),
  campus_id uuid not null references public.campuses(id),
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  display_name text not null check (char_length(display_name) between 2 and 80),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  role text not null default 'member' check (role in ('member', 'moderator')),
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_campus_status_idx on public.profiles(campus_id, status);

create table public.location_zones (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id),
  label text not null check (char_length(label) between 2 and 80),
  active boolean not null default true,
  unique (campus_id, label),
  unique (id, campus_id)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id),
  organizer_id uuid not null references public.profiles(user_id),
  status text not null default 'open' check (status in ('open', 'cancelled', 'completed')),
  accepts_items boolean not null default false,
  note text check (char_length(note) <= 500),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, campus_id)
);
create index trips_feed_idx on public.trips(campus_id, status, created_at desc);

create table public.journey_legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  campus_id uuid not null,
  direction text not null check (direction in ('outward', 'return')),
  origin_zone_id uuid not null,
  destination_zone_id uuid not null,
  departure_at timestamptz not null,
  seats_available smallint not null check (seats_available between 1 and 8),
  fare_estimate numeric(10,2) check (fare_estimate >= 0),
  status text not null default 'open' check (status in ('open', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  foreign key (trip_id, campus_id) references public.trips(id, campus_id),
  foreign key (origin_zone_id, campus_id) references public.location_zones(id, campus_id),
  foreign key (destination_zone_id, campus_id) references public.location_zones(id, campus_id),
  unique (trip_id, direction),
  unique (id, campus_id),
  check (origin_zone_id <> destination_zone_id)
);
create index journey_legs_match_idx on public.journey_legs(campus_id, status, origin_zone_id, destination_zone_id, departure_at);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  leg_id uuid not null references public.journey_legs(id),
  requester_id uuid not null references public.profiles(user_id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (leg_id, requester_id)
);
create index join_requests_leg_status_idx on public.join_requests(leg_id, status);

create table public.leg_participants (
  leg_id uuid not null references public.journey_legs(id),
  user_id uuid not null references public.profiles(user_id),
  join_request_id uuid not null unique references public.join_requests(id),
  confirmed_at timestamptz not null default now(),
  primary key (leg_id, user_id)
);

create table public.item_requests (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id),
  requester_id uuid not null references public.profiles(user_id),
  preferred_zone_id uuid not null,
  description text not null check (char_length(description) between 5 and 1000),
  quantity integer not null check (quantity between 1 and 100),
  budget_limit numeric(10,2) not null check (budget_limit >= 0),
  deadline_at timestamptz not null,
  product_url text check (char_length(product_url) <= 2048),
  image_path text check (char_length(image_path) <= 500),
  status text not null default 'open' check (status in ('open', 'agreed', 'purchased', 'ready', 'completed', 'cancelled', 'disputed', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (preferred_zone_id, campus_id) references public.location_zones(id, campus_id)
);
create index item_requests_feed_idx on public.item_requests(campus_id, status, deadline_at);

create table public.item_fulfilments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.item_requests(id),
  traveller_id uuid not null references public.profiles(user_id),
  leg_id uuid not null references public.journey_legs(id),
  status text not null default 'offered' check (status in ('offered', 'declined', 'accepted', 'purchased', 'ready', 'completed', 'cancelled', 'disputed')),
  agreed_description text check (char_length(agreed_description) <= 1000),
  agreed_price numeric(10,2) check (agreed_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, traveller_id, leg_id)
);
create unique index item_one_active_fulfilment_idx on public.item_fulfilments(request_id) where status in ('accepted', 'purchased', 'ready', 'completed', 'disputed');
create index item_fulfilments_leg_idx on public.item_fulfilments(leg_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id),
  context_kind text not null check (context_kind in ('join', 'item')),
  context_id uuid not null,
  member_a uuid not null references public.profiles(user_id),
  member_b uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  unique (context_kind, context_id),
  check (member_a <> member_b)
);
create index conversations_member_a_idx on public.conversations(member_a, created_at desc);
create index conversations_member_b_idx on public.conversations(member_b, created_at desc);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id),
  sender_id uuid not null references public.profiles(user_id),
  body text not null check (char_length(body) between 1 and 4000),
  client_nonce uuid not null,
  created_at timestamptz not null default now(),
  unique (sender_id, client_nonce)
);
create index messages_page_idx on public.messages(conversation_id, id desc);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id),
  user_id uuid not null references public.profiles(user_id),
  last_read_message_id bigint references public.messages(id),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(user_id),
  kind text not null,
  entity_id uuid,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, dedupe_key)
);
create index notifications_inbox_idx on public.notifications(recipient_id, read_at, id desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id),
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  status text not null default 'active' check (status in ('active', 'invalid')),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id, status);

create table public.blocks (
  blocker_id uuid not null references public.profiles(user_id),
  blocked_id uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(user_id),
  target_kind text not null check (target_kind in ('profile', 'trip', 'item', 'message')),
  target_id text not null,
  reason text not null check (char_length(reason) between 10 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);
create index reports_review_idx on public.reports(status, created_at);

create table public.moderation_actions (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(user_id),
  report_id uuid references public.reports(id),
  target_kind text not null,
  target_id text not null,
  action text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- A definer helper avoids recursive profile policies. It reveals only eligibility.
create function private.active_campus_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.campus_id from public.profiles p join public.campuses c on c.id = p.campus_id
  where p.user_id = auth.uid() and p.status = 'active' and c.status = 'active'
  limit 1
$$;
create function private.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.user_id = auth.uid() and p.status = 'active' and p.role = 'moderator')
$$;
revoke all on function private.active_campus_id() from public;
revoke all on function private.is_moderator() from public;
grant usage on schema private to authenticated;
grant execute on function private.active_campus_id(), private.is_moderator() to authenticated;

do $$ declare t text; begin
  foreach t in array array['campuses','campus_domains','profiles','location_zones','trips','journey_legs','join_requests','leg_participants','item_requests','item_fulfilments','conversations','messages','conversation_reads','notifications','push_subscriptions','blocks','reports','moderation_actions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
  end loop;
end $$;

create policy campuses_read on public.campuses for select to authenticated using (id = (select private.active_campus_id()));
create policy domains_read on public.campus_domains for select to authenticated using ((select private.is_moderator()) and campus_id = (select private.active_campus_id()));
create policy profiles_read on public.profiles for select to authenticated using (user_id = (select auth.uid()) or (campus_id = (select private.active_campus_id()) and status = 'active'));
create policy zones_read on public.location_zones for select to authenticated using (campus_id = (select private.active_campus_id()) and active);
create policy trips_read on public.trips for select to authenticated using (campus_id = (select private.active_campus_id()));
create policy legs_read on public.journey_legs for select to authenticated using (campus_id = (select private.active_campus_id()));
create policy joins_read on public.join_requests for select to authenticated using (requester_id = (select auth.uid()) or exists (select 1 from public.journey_legs l join public.trips t on t.id = l.trip_id where l.id = leg_id and t.organizer_id = (select auth.uid())));
create policy participants_read on public.leg_participants for select to authenticated using (exists(select 1 from public.journey_legs l where l.id = leg_id and l.campus_id = (select private.active_campus_id())));
create policy items_read on public.item_requests for select to authenticated using (campus_id = (select private.active_campus_id()));
create policy fulfilments_read on public.item_fulfilments for select to authenticated using (traveller_id = (select auth.uid()) or exists(select 1 from public.item_requests r where r.id = request_id and r.requester_id = (select auth.uid())));
create policy conversations_read on public.conversations for select to authenticated using (campus_id = (select private.active_campus_id()) and (member_a = (select auth.uid()) or member_b = (select auth.uid())));
create policy messages_read on public.messages for select to authenticated using (exists(select 1 from public.conversations c where c.id = conversation_id and c.campus_id = (select private.active_campus_id()) and (c.member_a = (select auth.uid()) or c.member_b = (select auth.uid()))));
create policy reads_read on public.conversation_reads for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_read on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
create policy subscriptions_read on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy blocks_read on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy reports_read on public.reports for select to authenticated using (reporter_id = (select auth.uid()) or (select private.is_moderator()));
create policy moderation_read on public.moderation_actions for select to authenticated using ((select private.is_moderator()));

-- Deliberately no direct authenticated INSERT/UPDATE/DELETE grants. Narrow RPCs follow.
insert into public.campuses(code, name) values ('iiti', 'IIT Indore');
insert into public.campus_domains(domain, campus_id, enabled)
select 'iiti.ac.in', id, true from public.campuses where code = 'iiti';
