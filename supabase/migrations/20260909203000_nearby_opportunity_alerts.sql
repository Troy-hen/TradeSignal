alter table public.notification_preferences
  add column if not exists nearby_opportunity_alerts_enabled boolean not null default false;

-- Company owners/admins explicitly opt into this upsell channel. It is off by
-- default and the worker only sends one nearby digest per company per week.
drop function if exists public.upsert_company_notification_preferences(uuid, boolean, text, numeric, numeric, boolean);

create function public.upsert_company_notification_preferences(
  p_company_id uuid,
  p_channel_email boolean,
  p_digest_frequency text,
  p_instant_alert_min_score numeric,
  p_digest_min_score numeric,
  p_approval_alerts_enabled boolean,
  p_nearby_opportunity_alerts_enabled boolean
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notification_preferences;
begin
  if not public.is_company_admin(p_company_id) then
    raise exception 'not_authorized';
  end if;

  insert into public.notification_preferences (
    company_id, user_id, channel_email, digest_frequency,
    instant_alert_min_score, digest_min_score, approval_alerts_enabled,
    nearby_opportunity_alerts_enabled
  ) values (
    p_company_id, null, p_channel_email, p_digest_frequency,
    p_instant_alert_min_score, p_digest_min_score, p_approval_alerts_enabled,
    p_nearby_opportunity_alerts_enabled
  )
  on conflict (company_id) where user_id is null
  do update set
    channel_email = excluded.channel_email,
    digest_frequency = excluded.digest_frequency,
    instant_alert_min_score = excluded.instant_alert_min_score,
    digest_min_score = excluded.digest_min_score,
    approval_alerts_enabled = excluded.approval_alerts_enabled,
    nearby_opportunity_alerts_enabled = excluded.nearby_opportunity_alerts_enabled,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.upsert_company_notification_preferences(uuid, boolean, text, numeric, numeric, boolean, boolean) from public, anon;
grant execute on function public.upsert_company_notification_preferences(uuid, boolean, text, numeric, numeric, boolean, boolean) to authenticated;

drop function if exists public.browse_nearby_opportunities_for_company(uuid, integer);

create function public.browse_nearby_opportunities_for_company(
  p_company_id uuid,
  p_limit integer default 12
)
returns table (
  postcode_district text,
  post_town text,
  trade_category_name text,
  trade_category_slug text,
  opportunity_count bigint,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  monthly_price_pence integer,
  territory_status text,
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
with owned as (
  select distinct
    upper(trim(t.postcode_district)) as postcode_district,
    t.trade_category_id,
    pd.centroid
  from public.territory_claims claim
  join public.territories t on t.id = claim.territory_id
  join public.postcode_districts pd on upper(trim(pd.id)) = upper(trim(t.postcode_district))
  where claim.company_id = p_company_id
    and t.is_active
    and claim.status in ('active', 'suspended')
),
grouped as (
  select
    upper(trim(ato.postcode_district)) as postcode_district,
    coalesce(nullif(trim(pd.post_town), ''), upper(trim(ato.postcode_district))) as post_town,
    ato.trade_category_id,
    tc.name as trade_category_name,
    tc.slug as trade_category_slug,
    coalesce(avg(pa.latitude) filter (where pa.latitude is not null), st_y(pd.centroid::geometry)) as latitude,
    coalesce(avg(pa.longitude) filter (where pa.longitude is not null), st_x(pd.centroid::geometry)) as longitude,
    pd.centroid,
    count(distinct ato.id) as opportunity_count,
    coalesce(sum(ato.estimated_trade_value_low), 0)::numeric as estimated_trade_value_low,
    coalesce(sum(ato.estimated_trade_value_high), 0)::numeric as estimated_trade_value_high,
    tc.default_monthly_price_pence as monthly_price_pence
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.postcode_districts pd on upper(trim(pd.id)) = upper(trim(ato.postcode_district))
  join public.trade_categories tc on tc.id = ato.trade_category_id and tc.is_active
  where ato.is_active
  group by
    upper(trim(ato.postcode_district)),
    pd.post_town,
    ato.trade_category_id,
    tc.name,
    tc.slug,
    pd.centroid,
    tc.default_monthly_price_pence
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
  e.trade_category_name,
  e.trade_category_slug,
  e.opportunity_count,
  e.estimated_trade_value_low,
  e.estimated_trade_value_high,
  e.monthly_price_pence,
  'available'::text,
  e.teaser_project_type,
  e.teaser_status,
  e.teaser_estimated_trade_value_low,
  e.teaser_estimated_trade_value_high
from enriched e
where e.centroid is not null
  and exists (
    select 1
    from owned o
    where o.trade_category_id = e.trade_category_id
      and o.centroid is not null
      and st_dwithin(o.centroid, e.centroid, 20 * 1609.344)
  )
  and not exists (
    select 1
    from owned o
    where o.postcode_district = e.postcode_district
      and o.trade_category_id = e.trade_category_id
  )
  and not exists (
    select 1
    from public.territories t
    join public.territory_claims claim on claim.territory_id = t.id
    where upper(trim(t.postcode_district)) = e.postcode_district
      and t.trade_category_id = e.trade_category_id
      and (claim.status in ('active', 'suspended') or (claim.status = 'reserved' and claim.reserved_expires_at > now()))
  )
order by e.opportunity_count desc, e.postcode_district
limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

-- This helper is intentionally callable only by the service role used by the
-- notification worker. It contains no address or applicant fields.
revoke all on function public.browse_nearby_opportunities_for_company(uuid, integer) from public, anon, authenticated;
grant execute on function public.browse_nearby_opportunities_for_company(uuid, integer) to service_role;

drop function if exists public.browse_nearby_opportunities(integer);

create function public.browse_nearby_opportunities(p_limit integer default 12)
returns table (
  postcode_district text,
  post_town text,
  trade_category_name text,
  trade_category_slug text,
  opportunity_count bigint,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  monthly_price_pence integer,
  territory_status text,
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
  select nearby.*
  from public.auth_company_ids() as company_ids(company_id)
  cross join lateral public.browse_nearby_opportunities_for_company(company_ids.company_id, p_limit) nearby
  where auth.uid() is not null
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.browse_nearby_opportunities(integer) from public, anon;
grant execute on function public.browse_nearby_opportunities(integer) to authenticated;
