-- Public and signed-in free previews remain aggregate-only. Specific
-- opportunities, provider records and AI detail require an active territory.

create or replace function public.check_territory_availability(p_postcode_district text, p_trade_slug text)
returns table (
  applications_last_30d int,
  high_priority_count int,
  estimated_construction_activity_gbp numeric,
  estimated_trade_value_gbp numeric,
  territory_status text,
  monthly_price_pence int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_district text := upper(trim(p_postcode_district));
  v_trade_id uuid;
begin
  select id into v_trade_id from public.trade_categories where slug = p_trade_slug and is_active;
  if v_trade_id is null then
    raise exception 'unknown_trade';
  end if;

  return query
  select
    count(*) filter (where pa.received_date >= current_date - interval '30 days')::int,
    count(*) filter (
      where pa.received_date >= current_date - interval '30 days'
        and ato.opportunity_bucket = 'hot'
    )::int,
    coalesce(sum(ac.estimated_total_project_value_high) filter (where pa.received_date >= current_date - interval '30 days'), 0),
    coalesce(sum(ato.estimated_trade_value_high) filter (where pa.received_date >= current_date - interval '30 days'), 0),
    coalesce(
      (select tc.status::text from public.territory_claims tc
       join public.territories t on t.id = tc.territory_id
       where t.postcode_district = v_district and t.trade_category_id = v_trade_id
         and tc.status in ('reserved', 'active', 'suspended')
       limit 1),
      'available'
    ),
    coalesce(
      (select t.monthly_price_pence from public.territories t
       where t.postcode_district = v_district and t.trade_category_id = v_trade_id),
      (select default_monthly_price_pence from public.trade_categories where id = v_trade_id)
    )
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.application_classifications ac on ac.id = ato.application_classification_id
  where ato.postcode_district = v_district
    and ato.trade_category_id = v_trade_id
    and ato.is_active;
end;
$$;

revoke execute on function public.check_territory_availability(text, text) from public;
grant execute on function public.check_territory_availability(text, text) to anon, authenticated;

drop function if exists public.browse_territory_activity(text, uuid, int);
drop function if exists public.browse_territory_opportunities(text, uuid, int);

drop function if exists public.browse_opportunity_teaser(uuid);

create function public.browse_opportunity_teaser(p_opportunity_id uuid)
returns table (
  id uuid,
  postcode_district text,
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
    ato.id,
    ato.postcode_district,
    tc.id,
    tc.name,
    tc.slug,
    coalesce(t.monthly_price_pence, tc.default_monthly_price_pence),
    coalesce(
      (
        select tc2.status::text
        from public.territory_claims tc2
        where tc2.territory_id = t.id
          and tc2.status in ('reserved', 'active', 'suspended')
        limit 1
      ),
      'available'
    )
  from public.application_trade_opportunities ato
  join public.trade_categories tc on tc.id = ato.trade_category_id
  left join public.territories t
    on t.postcode_district = ato.postcode_district
   and t.trade_category_id = ato.trade_category_id
  where ato.id = p_opportunity_id
    and ato.is_active
$$;

revoke execute on function public.browse_opportunity_teaser(uuid) from public, anon;
grant execute on function public.browse_opportunity_teaser(uuid) to authenticated;
