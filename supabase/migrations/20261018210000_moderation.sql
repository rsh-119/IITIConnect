alter table public.reports add column campus_id uuid references public.campuses(id);
update public.reports r set campus_id=p.campus_id from public.profiles p where p.user_id=r.reporter_id;
alter table public.reports alter column campus_id set not null;
drop policy reports_read on public.reports;
create policy reports_read on public.reports for select to authenticated using
  (reporter_id=auth.uid() or ((select private.is_moderator()) and campus_id=(select private.active_campus_id())));
drop policy moderation_read on public.moderation_actions;
create policy moderation_read on public.moderation_actions for select to authenticated using
  ((select private.is_moderator()) and exists(select 1 from public.reports r where r.id=report_id and r.campus_id=(select private.active_campus_id())));

create function public.block_member(p_member_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_member_id=auth.uid() or not exists(
    select 1 from public.profiles where user_id=p_member_id and campus_id=private.active_campus_id() and status='active'
  ) then raise exception 'Member unavailable' using errcode='22023'; end if;
  insert into public.blocks(blocker_id,blocked_id) values(auth.uid(),p_member_id)
  on conflict do nothing;
end $$;

create function public.unblock_member(p_member_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.active_campus_id() is null then raise exception 'Account unavailable' using errcode='28000'; end if;
  delete from public.blocks where blocker_id=auth.uid() and blocked_id=p_member_id;
end $$;

create function public.report_content(p_target_kind text,p_target_id text,p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_campus uuid; v_target_user uuid;
begin
  v_campus := private.active_campus_id();
  if v_campus is null or char_length(trim(p_reason)) not between 10 and 1000 then
    raise exception 'Invalid report' using errcode='22023'; end if;
  if p_target_kind='profile' then
    select campus_id,user_id into v_campus,v_target_user from public.profiles where user_id=p_target_id::uuid;
  elsif p_target_kind='trip' then
    select campus_id,organizer_id into v_campus,v_target_user from public.trips where id=p_target_id::uuid;
  elsif p_target_kind='item' then
    select campus_id,requester_id into v_campus,v_target_user from public.item_requests where id=p_target_id::uuid;
  elsif p_target_kind='message' then
    select c.campus_id,m.sender_id into v_campus,v_target_user
    from public.messages m join public.conversations c on c.id=m.conversation_id
    where m.id=p_target_id::bigint and auth.uid() in (c.member_a,c.member_b);
  else raise exception 'Invalid target' using errcode='22023'; end if;
  if v_campus is null or v_campus <> private.active_campus_id() or v_target_user=auth.uid() then
    raise exception 'Target unavailable' using errcode='22023'; end if;
  insert into public.reports(reporter_id,campus_id,target_kind,target_id,reason)
  values(auth.uid(),v_campus,p_target_kind,p_target_id,trim(p_reason)) returning id into v_id;
  return v_id;
end $$;

create function public.review_report(p_report_id uuid,p_decision text,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_report public.reports%rowtype;
begin
  if not private.is_moderator() or char_length(trim(p_reason)) not between 10 and 1000
     or p_decision not in ('dismiss','suspend','remove') then
    raise exception 'Review unavailable' using errcode='28000'; end if;
  select * into v_report from public.reports where id=p_report_id for update;
  if v_report.id is null or v_report.campus_id <> private.active_campus_id() or v_report.status <> 'open' then
    raise exception 'Report unavailable' using errcode='22023'; end if;
  if p_decision='suspend' then
    if v_report.target_kind <> 'profile' or v_report.target_id::uuid=auth.uid() then
      raise exception 'Invalid suspension target' using errcode='22023'; end if;
    update public.profiles set status='suspended',updated_at=now()
    where user_id=v_report.target_id::uuid and campus_id=v_report.campus_id and role='member';
    if not found then raise exception 'Member unavailable' using errcode='22023'; end if;
  elsif p_decision='remove' then
    if v_report.target_kind='trip' then
      update public.trips set status='cancelled',updated_at=now() where id=v_report.target_id::uuid and campus_id=v_report.campus_id;
      update public.journey_legs set status='cancelled' where trip_id=v_report.target_id::uuid;
    elsif v_report.target_kind='item' then
      update public.item_requests set status='cancelled',updated_at=now() where id=v_report.target_id::uuid and campus_id=v_report.campus_id;
    else raise exception 'Invalid removal target' using errcode='22023'; end if;
    if not found then raise exception 'Content unavailable' using errcode='22023'; end if;
  end if;
  update public.reports set status=case when p_decision='dismiss' then 'dismissed' else 'reviewed' end where id=p_report_id;
  insert into public.moderation_actions(actor_id,report_id,target_kind,target_id,action,reason)
  values(auth.uid(),p_report_id,v_report.target_kind,v_report.target_id,p_decision,trim(p_reason));
end $$;

revoke all on function public.block_member(uuid),public.unblock_member(uuid),
  public.report_content(text,text,text),public.review_report(uuid,text,text) from public,anon;
grant execute on function public.block_member(uuid),public.unblock_member(uuid),
  public.report_content(text,text,text),public.review_report(uuid,text,text) to authenticated;
