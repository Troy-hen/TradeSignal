-- Data Coverage now represents the opportunity sources MyTradeBox actually uses,
-- not only the original planning feed. Counts are deliberately aggregate and do
-- not expose customer-specific territory or workflow data.

create or replace function public.browse_intelligence_feed_coverage()
returns table (
  source_key text,
  source_label text,
  source_kind text,
  record_count bigint,
  tender_count bigint,
  pipeline_count bigint,
  award_count bigint,
  commercial_count bigint,
  latest_record_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with planning as (
    select
      count(*)::bigint as record_count,
      count(*) filter (where pa.is_commercial is true)::bigint as commercial_count,
      max(coalesce(pa.last_seen_at, pa.updated_at, pa.created_at)) as latest_record_at
    from public.planning_applications pa
  ),
  expected_market_sources(source_key, source_label) as (
    values
      ('find-a-tender'::text, 'Find a Tender'::text),
      ('contracts-finder'::text, 'Contracts Finder'::text)
  ),
  market as (
    select
      expected.source_key,
      expected.source_label,
      count(ms.id) filter (where ms.is_active)::bigint as record_count,
      count(ms.id) filter (where ms.is_active and ms.signal_type = 'tender')::bigint as tender_count,
      count(ms.id) filter (where ms.is_active and ms.signal_type = 'public_pipeline')::bigint as pipeline_count,
      count(ms.id) filter (where ms.is_active and ms.signal_type = 'contract_award')::bigint as award_count,
      count(ms.id) filter (where ms.is_active and ms.signal_type = 'commercial_development')::bigint as commercial_count,
      max(coalesce(ms.source_updated_at, ms.published_at, ms.updated_at, ms.created_at)) filter (where ms.is_active) as latest_record_at
    from expected_market_sources expected
    left join public.market_signals ms on ms.source = expected.source_key
    group by expected.source_key, expected.source_label
  )
  select
    'plota'::text,
    'Planning applications'::text,
    'planning'::text,
    planning.record_count,
    0::bigint,
    0::bigint,
    0::bigint,
    planning.commercial_count,
    planning.latest_record_at
  from planning
  union all
  select
    market.source_key,
    market.source_label,
    'public_procurement'::text,
    market.record_count,
    market.tender_count,
    market.pipeline_count,
    market.award_count,
    market.commercial_count,
    market.latest_record_at
  from market
  order by 3, 2;
$$;

revoke all on function public.browse_intelligence_feed_coverage() from public, anon;
grant execute on function public.browse_intelligence_feed_coverage() to authenticated;
