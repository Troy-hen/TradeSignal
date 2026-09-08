-- Reuses the same Vault-stored cron_secret as ingestion (see
-- 20260907170200_ingestion_cron.sql) — one dedicated bearer token for every
-- pg_cron -> Edge Function call in this project.
select cron.schedule(
  'classify-planning-application',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://dvpxmjrpdrwzgnjrhazf.supabase.co/functions/v1/classify-planning-application',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
