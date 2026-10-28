-- Expire unclaimed item opportunities without cancelling purchases or disputes.
create function private.expire_open_items() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.item_requests set status='expired',updated_at=now()
  where status='open' and deadline_at<=now();
  get diagnostics v_count = row_count;
  update public.item_fulfilments f set status='cancelled',updated_at=now()
  from public.item_requests r
  where f.request_id=r.id and r.status='expired' and f.status='offered';
  return v_count;
end $$;
revoke all on function private.expire_open_items() from public,anon,authenticated;

create or replace function public.review_report(p_report_id uuid,p_decision text,p_reason text) returns void
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
      update public.trips set status='cancelled',updated_at=now()
      where id=v_report.target_id::uuid and campus_id=v_report.campus_id;
      if not found then raise exception 'Content unavailable' using errcode='22023'; end if;
      update public.journey_legs set status='cancelled' where trip_id=v_report.target_id::uuid;
    elsif v_report.target_kind='item' then
      if exists(select 1 from public.item_requests where id=v_report.target_id::uuid
        and campus_id=v_report.campus_id and status in ('purchased','ready','completed','disputed')) then
        raise exception 'Item has an active purchase or dispute' using errcode='22023'; end if;
      update public.item_requests set status='cancelled',updated_at=now()
      where id=v_report.target_id::uuid and campus_id=v_report.campus_id;
      if not found then raise exception 'Content unavailable' using errcode='22023'; end if;
      update public.item_fulfilments set status='cancelled',updated_at=now()
      where request_id=v_report.target_id::uuid and status in ('offered','accepted');
    else raise exception 'Invalid removal target' using errcode='22023'; end if;
  end if;
  update public.reports set status=case when p_decision='dismiss' then 'dismissed' else 'reviewed' end where id=p_report_id;
  insert into public.moderation_actions(actor_id,report_id,target_kind,target_id,action,reason)
  values(auth.uid(),p_report_id,v_report.target_kind,v_report.target_id,p_decision,trim(p_reason));
end $$;
