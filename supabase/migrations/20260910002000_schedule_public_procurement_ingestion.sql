do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('enqueue-public-procurement-signals','process-public-procurement-signals');
exception when others then null;
end $$;

select cron.schedule(
  'enqueue-public-procurement-signals',
  '15 */3 * * *',
  $$select public.enqueue_market_signal_fetches(interval '4 hours', 100);$$
);

select cron.schedule(
  'process-public-procurement-signals',
  '*/10 * * * *',
  $$
  select case
    when exists (
      select 1 from public.market_signal_fetch_jobs
      where status in ('queued','processing')
    )
    then net.http_post(
      url := 'https://dvpxmjrpdrwzgnjrhazf.supabase.co/functions/v1/ingest-market-signals',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name='cron_secret'
        )
      ),
      body := jsonb_build_object('process_fetch_jobs', true)
    )
    else null::bigint
  end;
  $$
);
