-- Profile enrollment requires confirmed Auth email and an enabled campus domain.
create function public.create_own_profile(p_display_name text)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_user auth.users%rowtype;
  v_campus uuid;
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if char_length(trim(p_display_name)) not between 2 and 80 then raise exception 'Invalid display name' using errcode = '22023'; end if;
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null or v_user.email_confirmed_at is null then
    raise exception 'Email not confirmed' using errcode = '28000';
  end if;
  select d.campus_id into v_campus from public.campus_domains d
  join public.campuses c on c.id = d.campus_id
  where d.domain = lower(split_part(v_user.email, '@', 2)) and d.enabled and c.status = 'active';
  if v_campus is null then raise exception 'Email domain not permitted' using errcode = '28000'; end if;
  insert into public.profiles(user_id,campus_id,display_name)
  values (v_user.id,v_campus,trim(p_display_name))
  on conflict (user_id) do nothing;
  select * into v_profile from public.profiles where user_id = v_user.id;
  if v_profile.status <> 'active' then raise exception 'Account unavailable' using errcode = '28000'; end if;
  return v_profile;
end $$;

create function public.update_own_profile(p_display_name text, p_notification_preferences jsonb default '{}'::jsonb)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles%rowtype;
begin
  if auth.uid() is null or private.active_campus_id() is null then raise exception 'Account unavailable' using errcode = '28000'; end if;
  if char_length(trim(p_display_name)) not between 2 and 80 then raise exception 'Invalid display name' using errcode = '22023'; end if;
  if jsonb_typeof(p_notification_preferences) <> 'object' or octet_length(p_notification_preferences::text) > 2048 then
    raise exception 'Invalid preferences' using errcode = '22023';
  end if;
  update public.profiles set display_name = trim(p_display_name), notification_preferences = p_notification_preferences, updated_at = now()
  where user_id = auth.uid() and status = 'active' returning * into v_profile;
  if v_profile.user_id is null then raise exception 'Account unavailable' using errcode = '28000'; end if;
  return v_profile;
end $$;

revoke all on function public.create_own_profile(text) from public, anon;
revoke all on function public.update_own_profile(text,jsonb) from public, anon;
grant execute on function public.create_own_profile(text), public.update_own_profile(text,jsonb) to authenticated;
