-- Supabase Cron creates its own schema. This migration requires a Supabase project.
create extension if not exists pg_cron;

select cron.schedule(
  'iiticonnect-expire-opportunities',
  '*/5 * * * *',
  'select private.expire_open_items(), private.expire_open_trips()'
);
