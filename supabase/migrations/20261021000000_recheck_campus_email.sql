-- A profile is not sufficient after an Auth email change or domain disablement.
create or replace function private.active_campus_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.campus_id
  from public.profiles p
  join public.campuses c on c.id = p.campus_id
  join auth.users u on u.id = p.user_id
  join public.campus_domains d on d.campus_id = p.campus_id
    and d.domain = lower(split_part(u.email, '@', 2))
  where p.user_id = auth.uid()
    and p.status = 'active'
    and c.status = 'active'
    and u.email_confirmed_at is not null
    and d.enabled
  limit 1
$$;

create or replace function private.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.status = 'active'
      and p.role = 'moderator'
      and p.campus_id = private.active_campus_id()
  )
$$;
