create table if not exists public.market_signal_fetch_jobs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  request_url text not null,
  request_id bigint not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  since_at timestamptz not null,
  requested_limit integer not null default 50,
  response_status integer,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists market_signal_fetch_jobs_queue_idx on public.market_signal_fetch_jobs(status, created_at);
alter table public.market_signal_fetch_jobs enable row level security;
revoke all on public.market_signal_fetch_jobs from anon, authenticated;

create or replace function public.enqueue_market_signal_fetches(
  p_since interval default interval '3 days',
  p_limit integer default 50
)
returns integer
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_since timestamptz := now() - p_since;
  v_to timestamptz := now();
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_url text;
  v_request_id bigint;
  v_count integer := 0;
  v_provider text;
begin
  foreach v_provider in array array['find-a-tender','contracts-finder'] loop
    if exists (
      select 1 from public.market_signal_fetch_jobs j
      where j.provider = v_provider and j.status in ('queued','processing') and j.created_at > now() - interval '90 minutes'
    ) then
      continue;
    end if;

    if v_provider = 'find-a-tender' then
      v_url := 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?limit=' || v_limit::text
        || '&stages=planning,tender,award&updatedFrom=' || to_char(v_since at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS')
        || '&updatedTo=' || to_char(v_to at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS');
    else
      v_url := 'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit=' || v_limit::text
        || '&stages=planning,tender,award&publishedFrom=' || to_char(v_since at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
        || '&publishedTo=' || to_char(v_to at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"');
    end if;

    select public.queue_public_market_signal_fetch(v_url) into v_request_id;
    insert into public.market_signal_fetch_jobs(provider, request_url, request_id, since_at, requested_limit)
    values (v_provider, v_url, v_request_id, v_since, v_limit);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.enqueue_market_signal_fetches(interval, integer) from public, anon, authenticated;
grant execute on function public.enqueue_market_signal_fetches(interval, integer) to service_role;
