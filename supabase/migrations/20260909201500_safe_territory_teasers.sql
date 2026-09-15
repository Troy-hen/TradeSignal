-- Safe preview surfaces expose only non-identifying project metadata. Addresses,
-- planning references, applicant data and provider payloads remain paywalled.

drop function if exists public.browse_opportunity_teaser(uuid);

create function public.browse_opportunity_teaser(p_opportunity_id uuid)
returns table (
  id uuid,
  opportunity_score numeric,
  opportunity_bucket public.opportunity_bucket,
  project_type text,
  postcode_district text,
  planning_status public.planning_application_status,
  estimated_total_project_value_low numeric,
  estimated_total_project_value_high numeric,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  received_date date,
  trade_category_id uuid,
  trade_category_name text,
  trade_category_slug text,
  monthly_price_pence integer,
  territory_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ato.id,
    ato.opportunity_score,
    ato.opportunity_bucket,
    ac.project_type,
    upper(trim(ato.postcode_district)),
    pa.status,
    ac.estimated_total_project_value_low,
    ac.estimated_total_project_value_high,
    ato.estimated_trade_value_low,
    ato.estimated_trade_value_high,
    pa.received_date,
    tc.id,
    tc.name,
    tc.slug,
    coalesce(t.monthly_price_pence, tc.default_monthly_price_pence),
    coalesce(
      (
        select claim.status::text
        from public.territory_claims claim
        where claim.territory_id = t.id
          and claim.status in ('reserved', 'active', 'suspended')
        limit 1
      ),
      'available'
    )
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.application_classifications ac on ac.id = ato.application_classification_id
  join public.trade_categories tc on tc.id = ato.trade_category_id
  left join public.territories t
    on upper(trim(t.postcode_district)) = upper(trim(ato.postcode_district))
   and t.trade_category_id = ato.trade_category_id
  where ato.id = p_opportunity_id
    and ato.is_active;
$$;

revoke all on function public.browse_opportunity_teaser(uuid) from public, anon;
grant execute on function public.browse_opportunity_teaser(uuid) to authenticated;

drop function if exists public.browse_territory_teaser(text, text);

create function public.browse_territory_teaser(
  p_postcode_district text,
  p_trade_slug text
)
returns table (
  project_type text,
  planning_status public.planning_application_status,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ac.project_type,
    pa.status,
    ato.estimated_trade_value_low,
    ato.estimated_trade_value_high
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.application_classifications ac on ac.id = ato.application_classification_id
  join public.trade_categories tc on tc.id = ato.trade_category_id
  where upper(trim(ato.postcode_district)) = upper(trim(p_postcode_district))
    and tc.slug = lower(trim(p_trade_slug))
    and tc.is_active
    and ato.is_active
  order by ato.opportunity_score desc nulls last, pa.received_date desc nulls last, ato.created_at desc
  limit 1;
$$;

revoke all on function public.browse_territory_teaser(text, text) from public;
grant execute on function public.browse_territory_teaser(text, text) to anon, authenticated;

drop function if exists public.browse_opportunity_map(text, integer);

create function public.browse_opportunity_map(
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
  trade_category_id uuid,
  trade_name text,
  trade_slug text,
  territory_status text,
  monthly_price_pence integer,
  teaser_project_type text,
  teaser_status text,
  teaser_estimated_trade_value_low numeric,
  teaser_estimated_trade_value_high numeric
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
    coalesce(sum(ato.estimated_trade_value_high), 0)::numeric as estimated_trade_value_high
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
    teaser.estimated_trade_value_high as teaser_estimated_trade_value_high
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
)
select
  e.postcode_district,
  e.post_town,
  e.latitude,
  e.longitude,
  e.opportunity_count,
  e.estimated_trade_value_low,
  e.estimated_trade_value_high,
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
  e.teaser_estimated_trade_value_high
from enriched e
where e.postcode_district is not null
  and e.latitude is not null
  and e.longitude is not null
order by e.opportunity_count desc, e.postcode_district
limit least(greatest(coalesce(p_limit, 2000), 1), 2000);
$$;

revoke all on function public.browse_opportunity_map(text, integer) from public, anon;
grant execute on function public.browse_opportunity_map(text, integer) to authenticated;
