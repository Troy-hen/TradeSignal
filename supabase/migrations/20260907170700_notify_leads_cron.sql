-- Three schedules, one function, differentiated by the cadence in the
-- request body. Approval alerts and queued notification_log rows
-- (payment_failed, territory_available) are processed on every one of
-- these ticks regardless of cadence — see notify-leads/index.ts.
select cron.schedule(
  'notify-leads-instant',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://dvpxmjrpdrwzgnjrhazf.supabase.co/functions/v1/notify-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('cadence', 'instant')
  );
  $$
);

select cron.schedule(
  'notify-leads-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://dvpxmjrpdrwzgnjrhazf.supabase.co/functions/v1/notify-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('cadence', 'daily')
  );
  $$
);

select cron.schedule(
  'notify-leads-weekly',
  '0 7 * * 1',
  $$
  select net.http_post(
    url := 'https://dvpxmjrpdrwzgnjrhazf.supabase.co/functions/v1/notify-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('cadence', 'weekly')
  );
  $$
);
