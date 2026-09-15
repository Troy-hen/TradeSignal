-- pg_cron -> pg_net -> ingest-planning-applications Edge Function. The
-- bearer token lives in Supabase Vault and is referenced via subquery, so
-- it's never sitting in plaintext inside cron.job.command (visible to
-- anyone with SQL access) the way a hardcoded secret would be.
--
-- NOTE: the actual secret value must ALSO be set as this Edge Function's
-- own CRON_SECRET environment secret (Project Settings -> Edge Functions ->
-- ingest-planning-applications -> Secrets, or `supabase secrets set`) for
-- the function's own auth check to accept these calls — no MCP tool exposes
-- setting Edge Function secrets, so that one step needs doing from the
-- Supabase dashboard or CLI, from an environment with access to it.

select vault.create_secret(
  '9c142be2c3aea9dcc985bb7a3371d62e4943eebc7e899f5479c0685cab0ec641',
  'cron_secret',
  'Bearer token pg_net uses to call ingest-planning-applications; must match that function''s CRON_SECRET env secret.'
);

select cron.schedule(
  'ingest-planning-applications-new',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://dvpxmjrpdrwzgnjrhazf.supabase.co/functions/v1/ingest-planning-applications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('run_type', 'scheduled_new')
  );
  $$
);

-- Offset by 15 minutes from the "new" schedule so the two never race each
-- other against the same ingestion_runs cursor logic.
select cron.schedule(
  'ingest-planning-applications-updated',
  '15,45 * * * *',
  $$
  select net.http_post(
    url := 'https://dvpxmjrpdrwzgnjrhazf.supabase.co/functions/v1/ingest-planning-applications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('run_type', 'scheduled_updated')
  );
  $$
);
