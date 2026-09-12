-- Unified map surfaces for authenticated territory discovery.
-- Planning stays aggregated by district/trade. Public/commercial market signals
-- are returned as safe map teasers; full buyer/source detail is only returned
-- when the current company owns a qualifying territory for that signal.

create or replace function public.browse_opportunity_map_v2(
  p_trade_slug text default null,
  p_limit integer default 2000
)
returns table (
  postcode_district text,
  post_town text,
  latitude double precision,
  longitude double precision,
  opportunity_count bigint,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  commercial_opportunity_count bigint,
  commercial_estimated_trade_value_low numeric,
  commercial_estimated_trade_value_high numeric,
  trade_category_id uuid,
  trade_name text,
  trade_slug text,
  territory_status text,
  monthly_price_pence integer,
  teaser_project_type text,
  teaser_status text,
  teaser_estimated_trade_value_low numeric,
  teaser_estimated_trade_value_high numeric,
  commercial_teaser_project_type text,
  commercial_teaser_status text,
  commercial_teaser_estimated_trade_value_low numeric,
  commercial_teaser_estimated_trade_value_high numeric
)
language sql
stable
security definer
set search_path = public
as $$
with grouped as (
  select
    coalesce(nullif(trim(pa.postcode_district), ''), nullif(trim(ato.postcode_district), '')) as postcode_district,
    coalesce(
      nullif(trim(pd.post_town), ''),
      nullif(trim(pa.postcode_district), ''),
      nullif(trim(ato.postcode_district), ''),
      'Unknown'
    ) as post_town,
    ato.trade_category_id,
    tc.name as trade_name,
    tc.slug as trade_slug,
    coalesce(avg(pa.latitude) filter (where pa.latitude is not null), st_y(pd.centroid::geometry)) as latitude,
    coalesce(avg(pa.longitude) filter (where pa.longitude is not null), st_x(pd.centroid::geometry)) as longitude,
    count(distinct ato.id) as opportunity_count,
    coalesce(sum(ato.estimated_trade_value_low), 0)::numeric as estimated_trade_value_low,
    coalesce(sum(ato.estimated_trade_value_high), 0)::numeric as estimated_trade_value_high,
    count(distinct ato.id) filter (where pa.is_commercial is true) as commercial_opportunity_count,
    coalesce(sum(ato.estimated_trade_value_low) filter (where pa.is_commercial is true), 0)::numeric as commercial_estimated_trade_value_low,
    coalesce(sum(ato.estimated_trade_value_high) filter (where pa.is_commercial is true), 0)::numeric as commercial_estimated_trade_value_high
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  left join public.postcode_districts pd
    on upper(trim(pd.id)) = coalesce(nullif(trim(pa.postcode_district), ''), nullif(trim(ato.postcode_district), ''))
  join public.trade_categories tc on tc.id = ato.trade_category_id
  where ato.is_active
    and tc.is_active
    and (p_trade_slug is null or tc.slug = lower(trim(p_trade_slug)))
  group by
    pa.postcode_district,
    ato.postcode_district,
    pd.post_town,
    pd.centroid,
    ato.trade_category_id,
    tc.name,
    tc.slug
),
enriched as (
  select
    g.*,
    teaser.project_type as teaser_project_type,
    teaser.status as teaser_status,
    teaser.estimated_trade_value_low as teaser_estimated_trade_value_low,
    teaser.estimated_trade_value_high as teaser_estimated_trade_value_high,
    commercial_teaser.project_type as commercial_teaser_project_type,
    commercial_teaser.status as commercial_teaser_status,
    commercial_teaser.estimated_trade_value_low as commercial_teaser_estimated_trade_value_low,
    commercial_teaser.estimated_trade_value_high as commercial_teaser_estimated_trade_value_high
  from grouped g
  left join lateral (
    select
      ac.project_type,
      pa.status::text as status,
      ato.estimated_trade_value_low,
      ato.estimated_trade_value_high
    from public.application_trade_opportunities ato
    join public.planning_applications pa on pa.id = ato.planning_application_id
    join public.application_classifications ac on ac.id = ato.application_classification_id
    where ato.is_active
      and ato.trade_category_id = g.trade_category_id
      and upper(trim(ato.postcode_district)) = g.postcode_district
    order by ato.opportunity_score desc nulls last, pa.received_date desc nulls last, ato.created_at desc
    limit 1
  ) teaser on true
  left join lateral (
    select
      ac.project_type,
      pa.status::text as status,
      ato.estimated_trade_value_low,
      ato.estimated_trade_value_high
    from public.application_trade_opportunities ato
    join public.planning_applications pa on pa.id = ato.planning_application_id
    join public.application_classifications ac on ac.id = ato.application_classification_id
    where ato.is_active
      and pa.is_commercial is true
      and ato.trade_category_id = g.trade_category_id
      and upper(trim(ato.postcode_district)) = g.postcode_district
    order by ato.opportunity_score desc nulls last, pa.received_date desc nulls last, ato.created_at desc
    limit 1
  ) commercial_teaser on true
)
select
  e.postcode_district,
  e.post_town,
  e.latitude,
  e.longitude,
  e.opportunity_count,
  e.estimated_trade_value_low,
  e.estimated_trade_value_high,
  e.commercial_opportunity_count,
  e.commercial_estimated_trade_value_low,
  e.commercial_estimated_trade_value_high,
  e.trade_category_id,
  e.trade_name,
  e.trade_slug,
  case when exists (
    select 1
    from public.territories t
    join public.territory_claims claim on claim.territory_id = t.id
    where upper(trim(t.postcode_district)) = e.postcode_district
      and t.trade_category_id = e.trade_category_id
      and (claim.status in ('active', 'suspended') or (claim.status = 'reserved' and claim.reserved_expires_at > now()))
  ) then 'claimed' else 'available' end,
  coalesce(
    (
      select t.monthly_price_pence
      from public.territories t
      where upper(trim(t.postcode_district)) = e.postcode_district
        and t.trade_category_id = e.trade_category_id
      limit 1
    ),
    (
      select tc.default_monthly_price_pence
      from public.trade_categories tc
      where tc.id = e.trade_category_id
    )
  ),
  e.teaser_project_type,
  e.teaser_status,
  e.teaser_estimated_trade_value_low,
  e.teaser_estimated_trade_value_high,
  e.commercial_teaser_project_type,
  e.commercial_teaser_status,
  e.commercial_teaser_estimated_trade_value_low,
  e.commercial_teaser_estimated_trade_value_high
from enriched e
where e.postcode_district is not null
  and e.latitude is not null
  and e.longitude is not null
order by e.opportunity_count desc, e.postcode_district
limit least(greatest(coalesce(p_limit, 2000), 1), 2000);
$$;

revoke all on function public.browse_opportunity_map_v2(text, integer) from public, anon;
grant execute on function public.browse_opportunity_map_v2(text, integer) to authenticated;

create or replace function public.browse_market_signal_map(
  p_trade_slug text default null,
  p_limit integer default 600
)
returns table (
  market_signal_trade_match_id uuid,
  signal_type text,
  title text,
  postcode_district text,
  location_label text,
  location_scope text,
  latitude double precision,
  longitude double precision,
  delivery_postcode text,
  delivery_regions text[],
  trade_category_id uuid,
  trade_name text,
  trade_slug text,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  fit_score numeric,
  opportunity_bucket text,
  deadline_at timestamptz,
  buyer_name text,
  access_level text,
  source_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select cm.company_id into v_company_id
  from public.company_memberships cm
  where cm.user_id = auth.uid()
    and cm.status = 'active'
  order by cm.created_at
  limit 1;

  if v_company_id is null then return; end if;

  return query
  with ranked as (
    select
      mt.id as match_id,
      ms.signal_type,
      ms.title,
      ms.postcode_district,
      ms.location_text,
      ms.latitude,
      ms.longitude,
      ms.delivery_postcodes,
      ms.delivery_regions,
      ms.location_confidence,
      ms.external_ocid,
      ms.source,
      ms.source_signal_id,
      ms.updated_at,
      mt.trade_category_id,
      tc.name as trade_name,
      tc.slug as trade_slug,
      mt.estimated_trade_value_low,
      mt.estimated_trade_value_high,
      mt.fit_score,
      mt.opportunity_bucket::text as opportunity_bucket,
      ms.deadline_at,
      ms.buyer_name,
      ms.source_url,
      public.company_has_market_signal_access(v_company_id, mt.id) as has_access,
      row_number() over (
        partition by coalesce(nullif(ms.external_ocid, ''), ms.source || ':' || ms.source_signal_id), mt.trade_category_id
        order by ms.updated_at desc nulls last, mt.id
      ) as duplicate_rank
    from public.market_signal_trade_matches mt
    join public.market_signals ms on ms.id = mt.signal_id
    join public.trade_categories tc on tc.id = mt.trade_category_id
    where mt.is_active
      and ms.is_active
      and tc.is_active
      and coalesce(mt.fit_score, 0) >= 50
      and public.market_signal_is_current(ms.signal_type, ms.published_at, ms.deadline_at)
      and (p_trade_slug is null or tc.slug = lower(trim(p_trade_slug)))
      and (
        (ms.location_confidence = 'exact_postcode' and ms.postcode_district is not null)
        or
        (ms.location_confidence = 'delivery_region' and coalesce(array_length(ms.delivery_regions, 1), 0) > 0)
      )
  )
  select
    r.match_id,
    r.signal_type,
    case
      when r.has_access or r.signal_type <> 'commercial_development' then r.title
      else 'Commercial development opportunity'
    end,
    r.postcode_district,
    case
      when r.postcode_district is not null then r.postcode_district
      else coalesce(nullif(array_to_string(r.delivery_regions, ', '), ''), 'Regional opportunity')
    end,
    case when r.postcode_district is not null then 'exact' else 'regional' end,
    coalesce(
      r.latitude,
      case when pd.centroid is not null then st_y(pd.centroid::geometry) end,
      district_coords.latitude
    ),
    coalesce(
      r.longitude,
      case when pd.centroid is not null then st_x(pd.centroid::geometry) end,
      district_coords.longitude
    ),
    case
      when r.signal_type <> 'commercial_development' or r.has_access then r.delivery_postcodes[1]
      else null
    end,
    coalesce(r.delivery_regions, array[]::text[]),
    r.trade_category_id,
    r.trade_name,
    r.trade_slug,
    r.estimated_trade_value_low,
    r.estimated_trade_value_high,
    r.fit_score,
    r.opportunity_bucket,
    r.deadline_at,
    case when r.has_access then r.buyer_name else null end,
    case when r.has_access then 'full' else 'teaser' end,
    case when r.has_access then r.source_url else null end
  from ranked r
  left join public.postcode_districts pd
    on upper(trim(pd.id)) = upper(trim(r.postcode_district))
  left join lateral (
    select avg(pa.latitude) as latitude, avg(pa.longitude) as longitude
    from public.planning_applications pa
    where r.postcode_district is not null
      and upper(trim(pa.postcode_district)) = upper(trim(r.postcode_district))
      and pa.latitude is not null
      and pa.longitude is not null
  ) district_coords on true
  where r.duplicate_rank = 1
  order by coalesce(r.fit_score, 0) desc, r.deadline_at asc nulls last, r.updated_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 600), 1000));
end;
$$;

revoke all on function public.browse_market_signal_map(text, integer) from public, anon;
grant execute on function public.browse_market_signal_map(text, integer) to authenticated;
