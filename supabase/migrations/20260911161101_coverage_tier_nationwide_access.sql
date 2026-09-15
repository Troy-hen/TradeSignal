alter table public.coverage_plans
  add column if not exists coverage_tier text not null default 'local';

alter table public.coverage_plans
  drop constraint if exists coverage_plans_coverage_tier_check;

alter table public.coverage_plans
  add constraint coverage_plans_coverage_tier_check
  check (coverage_tier in ('local', 'regional', 'nationwide'));

create or replace function public.company_has_market_signal_access(p_company_id uuid, p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.coverage_plans cp
    where cp.company_id = p_company_id
      and cp.status = 'active'
      and cp.coverage_tier = 'nationwide'
  )
  or exists (
    select 1
    from public.market_signal_trade_matches mt
    join public.market_signals ms on ms.id = mt.signal_id
    where mt.id = p_match_id
      and mt.is_active
      and ms.is_active
      and (
        (
          ms.postcode_district is not null
          and exists (
            select 1
            from public.territory_claims cl
            join public.territories tr on tr.id = cl.territory_id
            where cl.company_id = p_company_id
              and cl.status = 'active'
              and tr.is_active
              and tr.trade_category_id = mt.trade_category_id
              and tr.postcode_district = ms.postcode_district
          )
        )
        or
        (
          ms.postcode_district is null
          and ms.location_confidence = 'delivery_region'
          and coalesce(array_length(ms.delivery_regions, 1), 0) > 0
          and exists (
            select 1
            from public.territory_claims cl
            join public.territories tr on tr.id = cl.territory_id
            join public.postcode_districts pd on pd.id = tr.postcode_district
            where cl.company_id = p_company_id
              and cl.status = 'active'
              and tr.is_active
              and tr.trade_category_id = mt.trade_category_id
              and exists (
                select 1
                from unnest(ms.delivery_regions) as region_name
                where public.normalise_market_signal_region(region_name) = public.normalise_market_signal_region(pd.region)
              )
          )
        )
      )
  )
$function$;

update public.coverage_plans cp
set coverage_tier = 'nationwide',
    monthly_price_pence = 9999,
    updated_at = now()
from public.companies c
where cp.company_id = c.id
  and c.trading_name = 'Demo Roofing Co'
  and cp.status = 'active';
