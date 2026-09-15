-- Workflow, cost-control, enrichment, map and freshness surfaces.
-- All customer-facing mutations are scoped through SECURITY DEFINER RPCs.

create table if not exists public.lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_match_id uuid not null references public.lead_matches(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  due_at timestamptz not null,
  note text,
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_follow_ups_company_status_due_idx
  on public.lead_follow_ups (company_id, status, due_at);
create index if not exists lead_follow_ups_match_idx
  on public.lead_follow_ups (lead_match_id, due_at);

alter table public.lead_follow_ups enable row level security;
drop policy if exists "lead_follow_ups_select_member" on public.lead_follow_ups;
create policy "lead_follow_ups_select_member"
  on public.lead_follow_ups for select using (public.is_company_member(company_id));
grant select on public.lead_follow_ups to authenticated;

create or replace function public.create_lead_follow_up(
  p_lead_match_id uuid, p_due_at timestamptz, p_note text default null
)
returns public.lead_follow_ups
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.lead_matches;
  v_row public.lead_follow_ups;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;

  select lm.* into v_match
  from public.lead_matches lm
  join public.application_trade_opportunities ato on ato.id = lm.application_trade_opportunity_id
  where lm.id = p_lead_match_id
    and lm.company_id in (select public.auth_company_ids())
    and public.has_active_lead_match(ato.planning_application_id)
  limit 1;

  if v_match.id is null then raise exception 'lead_not_found'; end if;
  if p_due_at <= now() or p_due_at > now() + interval '1 year' then raise exception 'invalid_due_at'; end if;

  insert into public.lead_follow_ups (lead_match_id, company_id, due_at, note, created_by)
  values (v_match.id, v_match.company_id, p_due_at, nullif(left(trim(coalesce(p_note, '')), 2000), ''), (select auth.uid()))
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.list_lead_follow_ups(p_lead_match_id uuid)
returns setof public.lead_follow_ups
language sql security definer set search_path = public
as $$
  select lf.*
  from public.lead_follow_ups lf
  where lf.lead_match_id = p_lead_match_id
    and lf.company_id in (select public.auth_company_ids())
  order by lf.status, lf.due_at;
$$;

create or replace function public.complete_lead_follow_up(p_follow_up_id uuid)
returns public.lead_follow_ups
language plpgsql security definer set search_path = public
as $$
declare v_row public.lead_follow_ups;
begin
  update public.lead_follow_ups
  set status = 'completed', completed_at = now(), completed_by = (select auth.uid()), updated_at = now()
  where id = p_follow_up_id and company_id in (select public.auth_company_ids()) and status = 'open'
  returning * into v_row;
  if v_row.id is null then raise exception 'follow_up_not_found'; end if;
  return v_row;
end;
$$;

create or replace function public.cancel_lead_follow_up(p_follow_up_id uuid)
returns public.lead_follow_ups
language plpgsql security definer set search_path = public
as $$
declare v_row public.lead_follow_ups;
begin
  update public.lead_follow_ups
  set status = 'cancelled', updated_at = now()
  where id = p_follow_up_id and company_id in (select public.auth_company_ids()) and status = 'open'
  returning * into v_row;
  if v_row.id is null then raise exception 'follow_up_not_found'; end if;
  return v_row;
end;
$$;

revoke all on function public.create_lead_follow_up(uuid, timestamptz, text) from public, anon;
revoke all on function public.list_lead_follow_ups(uuid) from public, anon;
revoke all on function public.complete_lead_follow_up(uuid) from public, anon;
revoke all on function public.cancel_lead_follow_up(uuid) from public, anon;
grant execute on function public.create_lead_follow_up(uuid, timestamptz, text) to authenticated;
grant execute on function public.list_lead_follow_ups(uuid) to authenticated;
grant execute on function public.complete_lead_follow_up(uuid) to authenticated;
grant execute on function public.cancel_lead_follow_up(uuid) to authenticated;

create table if not exists public.ai_outreach_generations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  generation_number integer not null check (generation_number between 1 and 2),
  status text not null default 'reserved' check (status in ('reserved', 'succeeded', 'failed')),
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12,6),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index if not exists ai_outreach_generations_number_idx
  on public.ai_outreach_generations (company_id, opportunity_id, generation_number);
create index if not exists ai_outreach_generations_company_created_idx
  on public.ai_outreach_generations (company_id, created_at desc);

alter table public.ai_outreach_generations enable row level security;
drop policy if exists "ai_outreach_generations_select_member" on public.ai_outreach_generations;
create policy "ai_outreach_generations_select_member"
  on public.ai_outreach_generations for select using (public.is_company_member(company_id));
grant select on public.ai_outreach_generations to authenticated;

create or replace function public.reserve_outreach_generation(p_opportunity_id uuid)
returns table (generation_id uuid, allowed boolean, generation_count integer, remaining_generations integer, reason text)
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
  v_generation_count integer;
  v_daily_count integer;
  v_monthly_count integer;
  v_generation_number integer;
  v_generation_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select lm.company_id into v_company_id
  from public.lead_matches lm
  where lm.application_trade_opportunity_id = p_opportunity_id
    and lm.company_id in (select public.auth_company_ids())
    and public.has_active_lead_match_for_opportunity(p_opportunity_id)
  order by lm.matched_at desc limit 1;

  if v_company_id is null then raise exception 'opportunity_not_found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_company_id::text || ':' || p_opportunity_id::text, 0));

  update public.ai_outreach_generations
  set status = 'failed', error_code = 'reservation_expired', completed_at = now()
  where company_id = v_company_id and opportunity_id = p_opportunity_id
    and status = 'reserved' and created_at < now() - interval '30 minutes';

  select count(*)::integer into v_generation_count
  from public.ai_outreach_generations
  where company_id = v_company_id and opportunity_id = p_opportunity_id
    and status in ('reserved', 'succeeded');

  if v_generation_count >= 2 then
    return query select null::uuid, false, v_generation_count, 0, 'opportunity_limit';
    return;
  end if;

  select count(*)::integer into v_daily_count
  from public.ai_outreach_generations
  where company_id = v_company_id and status in ('reserved', 'succeeded')
    and created_at >= date_trunc('day', now());
  if v_daily_count >= 20 then
    return query select null::uuid, false, v_generation_count, 2 - v_generation_count, 'daily_limit';
    return;
  end if;

  select count(*)::integer into v_monthly_count
  from public.ai_outreach_generations
  where company_id = v_company_id and status in ('reserved', 'succeeded')
    and created_at >= date_trunc('month', now());
  if v_monthly_count >= 100 then
    return query select null::uuid, false, v_generation_count, 2 - v_generation_count, 'monthly_limit';
    return;
  end if;

  select coalesce(max(aog.generation_number), 0) + 1 into v_generation_number
  from public.ai_outreach_generations aog
  where aog.company_id = v_company_id and aog.opportunity_id = p_opportunity_id;

  insert into public.ai_outreach_generations (company_id, opportunity_id, user_id, generation_number, status)
  values (v_company_id, p_opportunity_id, v_user_id, v_generation_number, 'reserved')
  returning id into v_generation_id;

  return query select v_generation_id, true, v_generation_number, 2 - v_generation_number, null::text;
end;
$$;

create or replace function public.complete_outreach_generation(
  p_generation_id uuid, p_status text, p_model text default null,
  p_input_tokens integer default null, p_output_tokens integer default null,
  p_estimated_cost_usd numeric default null, p_error_code text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('succeeded', 'failed') then raise exception 'invalid_generation_status'; end if;
  update public.ai_outreach_generations
  set status = p_status, model = nullif(trim(coalesce(p_model, '')), ''),
      input_tokens = p_input_tokens, output_tokens = p_output_tokens,
      estimated_cost_usd = p_estimated_cost_usd,
      error_code = nullif(trim(coalesce(p_error_code, '')), ''), completed_at = now()
  where id = p_generation_id and user_id = (select auth.uid()) and status = 'reserved';
  if not found then raise exception 'generation_not_found'; end if;
end;
$$;

create or replace function public.get_outreach_generation_status(p_opportunity_id uuid)
returns table (used_generations integer, remaining_generations integer, daily_used integer, daily_remaining integer, monthly_used integer, monthly_remaining integer)
language sql security definer set search_path = public
as $$
  select
    least(2, count(*) filter (where status in ('reserved', 'succeeded'))::integer),
    greatest(0, 2 - count(*) filter (where status in ('reserved', 'succeeded'))::integer),
    count(*) filter (where status in ('reserved', 'succeeded') and created_at >= date_trunc('day', now()))::integer,
    greatest(0, 20 - count(*) filter (where status in ('reserved', 'succeeded') and created_at >= date_trunc('day', now())))::integer,
    count(*) filter (where status in ('reserved', 'succeeded') and created_at >= date_trunc('month', now()))::integer,
    greatest(0, 100 - count(*) filter (where status in ('reserved', 'succeeded') and created_at >= date_trunc('month', now()))::integer)
  from public.ai_outreach_generations aog
  where aog.opportunity_id = p_opportunity_id
    and aog.company_id in (select public.auth_company_ids())
    and public.has_active_lead_match_for_opportunity(p_opportunity_id);
$$;

revoke all on function public.reserve_outreach_generation(uuid) from public, anon;
revoke all on function public.complete_outreach_generation(uuid, text, text, integer, integer, numeric, text) from public, anon;
revoke all on function public.get_outreach_generation_status(uuid) from public, anon;
grant execute on function public.reserve_outreach_generation(uuid) to authenticated;
grant execute on function public.complete_outreach_generation(uuid, text, text, integer, integer, numeric, text) to authenticated;
grant execute on function public.get_outreach_generation_status(uuid) to authenticated;

create table if not exists public.contact_enrichment_usage (
  company_id uuid not null references public.companies(id) on delete cascade,
  period_start date not null,
  lookup_count integer not null default 0 check (lookup_count >= 0),
  monthly_limit integer not null default 5 check (monthly_limit between 0 and 1000),
  updated_at timestamptz not null default now(),
  primary key (company_id, period_start)
);

create table if not exists public.contact_enrichment_lookups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  planning_application_id uuid not null references public.planning_applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  provider text not null default 'plota',
  status text not null default 'reserved' check (status in ('reserved', 'succeeded', 'failed')),
  error_code text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists contact_enrichment_lookups_company_period_idx
  on public.contact_enrichment_lookups (company_id, requested_at desc);

create table if not exists public.contact_enrichment_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  planning_application_id uuid not null references public.planning_applications(id) on delete cascade,
  contact_role text not null check (contact_role in ('applicant', 'agent', 'organisation', 'other')),
  full_name text,
  organisation text,
  email text,
  phone text,
  source_name text not null,
  source_url text,
  source_record_id text,
  provenance jsonb not null default '{}'::jsonb,
  lawful_basis text not null default 'legitimate_interest',
  purpose text not null default 'trade_outreach',
  is_public_source boolean not null default true,
  collected_at timestamptz not null default now(),
  verified_at timestamptz,
  expires_at timestamptz,
  suppressed_at timestamptz,
  suppression_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null or full_name is not null or organisation is not null)
);
create index if not exists contact_enrichment_records_company_app_idx
  on public.contact_enrichment_records (company_id, planning_application_id, collected_at desc);

alter table public.contact_enrichment_usage enable row level security;
alter table public.contact_enrichment_lookups enable row level security;
alter table public.contact_enrichment_records enable row level security;

drop policy if exists "contact_enrichment_usage_select_member" on public.contact_enrichment_usage;
create policy "contact_enrichment_usage_select_member"
  on public.contact_enrichment_usage for select using (public.is_company_member(company_id));
drop policy if exists "contact_enrichment_lookups_select_member" on public.contact_enrichment_lookups;
create policy "contact_enrichment_lookups_select_member"
  on public.contact_enrichment_lookups for select using (public.is_company_member(company_id));
drop policy if exists "contact_enrichment_records_select_active_match" on public.contact_enrichment_records;
create policy "contact_enrichment_records_select_active_match"
  on public.contact_enrichment_records for select
  using (public.is_company_member(company_id) and public.has_active_lead_match(planning_application_id));
grant select on public.contact_enrichment_usage, public.contact_enrichment_lookups, public.contact_enrichment_records to authenticated;

create or replace function public.reserve_contact_enrichment_lookup(p_planning_application_id uuid)
returns table (lookup_id uuid, company_id uuid, allowed boolean, remaining integer, reason text)
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
  v_period_start date := date_trunc('month', now())::date;
  v_lookup_count integer;
  v_limit integer;
  v_lookup_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select lm.company_id into v_company_id
  from public.lead_matches lm
  join public.application_trade_opportunities ato on ato.id = lm.application_trade_opportunity_id
  where ato.planning_application_id = p_planning_application_id
    and lm.company_id in (select public.auth_company_ids())
    and public.has_active_lead_match(p_planning_application_id)
  order by lm.matched_at desc limit 1;
  if v_company_id is null then raise exception 'application_not_found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_company_id::text || ':' || v_period_start::text, 0));
  insert into public.contact_enrichment_usage (company_id, period_start)
  values (v_company_id, v_period_start)
  on conflict (company_id, period_start) do nothing;

  select lookup_count, monthly_limit into v_lookup_count, v_limit
  from public.contact_enrichment_usage
  where company_id = v_company_id and period_start = v_period_start
  for update;

  if v_lookup_count >= v_limit then
    return query select null::uuid, v_company_id, false, 0, 'monthly_limit';
    return;
  end if;

  update public.contact_enrichment_usage
  set lookup_count = lookup_count + 1, updated_at = now()
  where company_id = v_company_id and period_start = v_period_start;

  insert into public.contact_enrichment_lookups (company_id, planning_application_id, user_id, status)
  values (v_company_id, p_planning_application_id, v_user_id, 'reserved')
  returning id into v_lookup_id;

  return query select v_lookup_id, v_company_id, true, v_limit - v_lookup_count - 1, null::text;
end;
$$;

create or replace function public.complete_contact_enrichment_lookup(
  p_lookup_id uuid, p_status text, p_error_code text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('succeeded', 'failed') then raise exception 'invalid_lookup_status'; end if;
  update public.contact_enrichment_lookups
  set status = p_status, error_code = nullif(trim(coalesce(p_error_code, '')), ''), completed_at = now()
  where id = p_lookup_id and user_id = (select auth.uid()) and status = 'reserved';
  if not found then raise exception 'lookup_not_found'; end if;

  if p_status = 'failed' then
    update public.contact_enrichment_usage u
    set lookup_count = greatest(0, u.lookup_count - 1), updated_at = now()
    where u.company_id = (select company_id from public.contact_enrichment_lookups where id = p_lookup_id)
      and u.period_start = date_trunc('month', now())::date;
  end if;
end;
$$;

revoke all on function public.reserve_contact_enrichment_lookup(uuid) from public, anon;
revoke all on function public.complete_contact_enrichment_lookup(uuid, text, text) from public, anon;
grant execute on function public.reserve_contact_enrichment_lookup(uuid) to authenticated;
grant execute on function public.complete_contact_enrichment_lookup(uuid, text, text) to authenticated;

create or replace function public.browse_opportunity_map(
  p_trade_slug text default null, p_limit integer default 300
)
returns table (
  postcode_district text, post_town text, latitude double precision, longitude double precision,
  opportunity_count bigint, estimated_trade_value_low numeric, estimated_trade_value_high numeric,
  trade_category_id uuid, trade_name text, trade_slug text, territory_status text, monthly_price_pence integer
)
language sql stable security definer set search_path = public
as $$
with grouped as (
  select
    pa.postcode_district,
    coalesce(pd.post_town, 'Unknown') as post_town,
    ato.trade_category_id,
    tc.name as trade_name,
    tc.slug as trade_slug,
    coalesce(avg(pa.latitude) filter (where pa.latitude is not null), st_y(pd.centroid::geometry)) as latitude,
    coalesce(avg(pa.longitude) filter (where pa.longitude is not null), st_x(pd.centroid::geometry)) as longitude,
    count(distinct ato.id) as opportunity_count,
    coalesce(sum(ato.estimated_trade_value_low), 0)::numeric as estimated_trade_value_low,
    coalesce(sum(ato.estimated_trade_value_high), 0)::numeric as estimated_trade_value_high
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.postcode_districts pd on pd.id = ato.postcode_district
  join public.trade_categories tc on tc.id = ato.trade_category_id
  where ato.is_active and tc.is_active
    and (p_trade_slug is null or tc.slug = lower(trim(p_trade_slug)))
  group by pa.postcode_district, pd.post_town, pd.centroid, ato.trade_category_id, tc.name, tc.slug
)
select
  g.postcode_district, g.post_town, g.latitude, g.longitude, g.opportunity_count,
  g.estimated_trade_value_low, g.estimated_trade_value_high, g.trade_category_id,
  g.trade_name, g.trade_slug,
  case when exists (
    select 1
    from public.territories t
    join public.territory_claims claim on claim.territory_id = t.id
    where t.postcode_district = g.postcode_district
      and t.trade_category_id = g.trade_category_id
      and (claim.status in ('active', 'suspended') or (claim.status = 'reserved' and claim.reserved_expires_at > now()))
  ) then 'claimed' else 'available' end as territory_status,
  coalesce(
    (select t.monthly_price_pence from public.territories t
      where t.postcode_district = g.postcode_district and t.trade_category_id = g.trade_category_id limit 1),
    (select tc.default_monthly_price_pence from public.trade_categories tc where tc.id = g.trade_category_id)
  ) as monthly_price_pence
from grouped g
where g.latitude is not null and g.longitude is not null
order by g.opportunity_count desc, g.postcode_district
limit least(greatest(coalesce(p_limit, 300), 1), 500);
$$;

revoke all on function public.browse_opportunity_map(text, integer) from public, anon;
grant execute on function public.browse_opportunity_map(text, integer) to authenticated;

create or replace function public.browse_data_coverage()
returns table (
  authority_name text, authority_code text, application_count bigint, district_count bigint,
  first_received_date date, latest_received_date date, latest_seen_at timestamptz, provider text
)
language sql stable security definer set search_path = public
as $$
  select
    coalesce(nullif(trim(pa.local_planning_authority), ''), 'Unknown authority'),
    nullif(trim(pa.local_planning_authority_code), ''),
    count(*)::bigint,
    count(distinct pa.postcode_district)::bigint,
    min(pa.received_date), max(pa.received_date), max(pa.last_seen_at), coalesce(max(pa.provider), 'plota')
  from public.planning_applications pa
  group by coalesce(nullif(trim(pa.local_planning_authority), ''), 'Unknown authority'),
           nullif(trim(pa.local_planning_authority_code), '')
  order by max(pa.last_seen_at) desc nulls last, count(*) desc;
$$;

create or replace function public.browse_data_coverage_snapshot()
returns table (
  provider text, latest_ingest_at timestamptz, latest_ingest_status text,
  latest_fetched integer, latest_created integer, latest_updated integer, latest_errors integer,
  application_count bigint, district_count bigint, authority_count bigint
)
language sql stable security definer set search_path = public
as $$
with latest_run as (
  select * from public.ingestion_runs order by started_at desc limit 1
),
totals as (
  select count(*)::bigint as application_count,
         count(distinct postcode_district)::bigint as district_count,
         count(distinct local_planning_authority)::bigint as authority_count
  from public.planning_applications
)
select coalesce(lr.provider, 'plota'), lr.finished_at, lr.status,
       coalesce(lr.applications_fetched, 0), coalesce(lr.applications_created, 0),
       coalesce(lr.applications_updated, 0), coalesce(lr.errors_count, 0),
       totals.application_count, totals.district_count, totals.authority_count
from totals left join latest_run lr on true;
$$;

revoke all on function public.browse_data_coverage() from public, anon;
revoke all on function public.browse_data_coverage_snapshot() from public, anon;
grant execute on function public.browse_data_coverage() to authenticated;
grant execute on function public.browse_data_coverage_snapshot() to authenticated;
