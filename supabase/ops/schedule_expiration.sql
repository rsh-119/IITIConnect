-- Recovery snippet if the job is ever removed from a Supabase project.
-- The initial job is installed by migration 20261019000000_schedule_expiration.sql.
select cron.schedule(
  'iiticonnect-expire-opportunities',
  '*/5 * * * *',
  'select private.expire_open_items(), private.expire_open_trips()'
);
