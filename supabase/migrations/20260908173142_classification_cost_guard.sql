-- Prevent automatic AI spend from retrying provider failures.
-- New and genuinely changed applications remain eligible through pending/stale.
create or replace function public.claim_classification_batch(p_limit int default 15)
returns table (
  id uuid,
  planning_application_id uuid,
  attempts int,
  previous_status public.classification_status
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.application_classifications ac
  set classification_status = 'processing'
  from (
    select ac2.id, ac2.classification_status as prev_status
    from public.application_classifications ac2
    where ac2.classification_status in ('pending', 'stale')
    order by ac2.updated_at asc
    limit p_limit
    for update skip locked
  ) claimed
  where ac.id = claimed.id
  returning ac.id, ac.planning_application_id, ac.attempts, claimed.prev_status;
end;
$$;

revoke all on function public.claim_classification_batch(int) from public;

-- Keep the schedule available, but do not even enqueue an Edge Function
-- request unless a new or changed application is waiting.
select cron.alter_job(
  job_id := j.jobid,
  command := $job$
  select case
    when exists (
      select 1
      from public.application_classifications
      where classification_status in ('pending', 'stale')
    )
    then net.http_post(
      url := 'https://dvpxmjrpdrwzgnjrhazf.supabase.co/functions/v1/classify-planning-application',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_secret'
        )
      ),
      body := '{}'::jsonb
    )
    else null::bigint
  end;
  $job$
)
from cron.job j
where j.jobname = 'classify-planning-application';
