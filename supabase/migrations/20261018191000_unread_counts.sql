create function public.conversation_unread_counts()
returns table(conversation_id uuid, unread_count bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, count(m.id)
  from public.conversations c
  left join public.conversation_reads r on r.conversation_id=c.id and r.user_id=auth.uid()
  left join public.messages m on m.conversation_id=c.id and m.sender_id<>auth.uid()
    and m.id>coalesce(r.last_read_message_id,0)
  where c.campus_id=private.active_campus_id() and auth.uid() in (c.member_a,c.member_b)
  group by c.id
$$;
revoke all on function public.conversation_unread_counts() from public,anon;
grant execute on function public.conversation_unread_counts() to authenticated;
