-- Hosted push and retention schedules. Not applied anywhere: run manually in the intended
-- Supabase project only after the app is deployed at a confirmed HTTPS origin.
-- Replace both placeholders; never commit the real token.

create extension if not exists pg_net with schema extensions;

-- Run once per project with that environment's PUSH_DISPATCH_SECRET.
select vault.create_secret('<PUSH_DISPATCH_SECRET>', 'iiticonnect_push_dispatch_token');

-- Every minute, ask the app to send queued notifications.
select cron.schedule(
  'iiticonnect-push-dispatch',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<confirmed-subdomain>.vercel.app/api/push/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'iiticonnect_push_dispatch_token'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- Check recent calls: select status_code, created from net._http_response order by created desc limit 20;
-- Remove: select cron.unschedule('iiticonnect-push-dispatch');

-- Daily at 03:00 IST (21:30 UTC), purge content past the 90-day retention rule.
select cron.schedule(
  'iiticonnect-retention-purge',
  '30 21 * * *',
  $$
  select net.http_post(
    url := 'https://<confirmed-subdomain>.vercel.app/api/maintenance/retention',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'iiticonnect_push_dispatch_token'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);
-- Remove: select cron.unschedule('iiticonnect-retention-purge');
