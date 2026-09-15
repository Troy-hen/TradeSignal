-- Free-tier single-opportunity teaser lookup, mirroring
-- browse_territory_opportunities' visible-tier column set (section 4.4)
-- but keyed by opportunity id — backs the locked-preview state of
-- /opportunities/[id] for a company with no active claim on that
-- district+trade (RLS on the real tables returns nothing for them, since
-- application_trade_opportunities' SELECT policy requires an existing
-- lead_matches row, which only exists once a claim is active).
create or replace function public.browse_opportunity_teaser(p_opportunity_id uuid)
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
  monthly_price_pence int,
  territory_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ato.id, ato.opportunity_score, ato.opportunity_bucket, ac.project_type,
    ato.postcode_district, pa.status, ac.estimated_total_project_value_low,
    ac.estimated_total_project_value_high, ato.estimated_trade_value_low,
    ato.estimated_trade_value_high, pa.received_date, tc.id, tc.name, tc.slug,
    coalesce(t.monthly_price_pence, tc.default_monthly_price_pence),
    coalesce(
      (select tc2.status::text from public.territory_claims tc2
       where tc2.territory_id = t.id and tc2.status in ('reserved', 'active', 'suspended')
       limit 1),
      'available'
    )
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.application_classifications ac on ac.id = ato.application_classification_id
  join public.trade_categories tc on tc.id = ato.trade_category_id
  left join public.territories t
    on t.postcode_district = ato.postcode_district and t.trade_category_id = ato.trade_category_id
  where ato.id = p_opportunity_id and ato.is_active
$$;
revoke all on function public.browse_opportunity_teaser(uuid) from public;
grant execute on function public.browse_opportunity_teaser(uuid) to authenticated;
