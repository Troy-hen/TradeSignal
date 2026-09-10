-- Classification is only expensive when pending/stale records exist. Resume
-- it at a calmer cadence now that the OpenAI path has passed live UAT.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'classify-planning-application'
  limit 1;

  if v_job_id is not null then
    perform cron.alter_job(
      job_id := v_job_id,
      schedule := '*/15 * * * *',
      active := true
    );
  end if;
end $$;
