-- Planning applications already carry district-level coordinates for the
-- imported feed. Do not discard those opportunities just because the optional
-- postcode-district enrichment table has not yet been populated for a district.
create or replace function public.browse_opportunity_map(
  p_trade_slug text default null, p_limit integer default 2000
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
  left join public.postcode_districts pd on pd.id = ato.postcode_district
  join public.trade_categories tc on tc.id = ato.trade_category_id
  where ato.is_active and tc.is_active
    and (p_trade_slug is null or tc.slug = lower(trim(p_trade_slug)))
  group by pa.postcode_district, ato.postcode_district, pd.post_town, pd.centroid,
    ato.trade_category_id, tc.name, tc.slug
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
where g.postcode_district is not null and g.latitude is not null and g.longitude is not null
order by g.opportunity_count desc, g.postcode_district
limit least(greatest(coalesce(p_limit, 2000), 1), 2000);
$$;

revoke all on function public.browse_opportunity_map(text, integer) from public, anon;
grant execute on function public.browse_opportunity_map(text, integer) to authenticated;
