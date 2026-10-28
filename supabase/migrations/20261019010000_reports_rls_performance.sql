drop policy reports_read on public.reports;
create policy reports_read on public.reports for select to authenticated using
  (reporter_id = (select auth.uid()) or
   ((select private.is_moderator()) and campus_id = (select private.active_campus_id())));
