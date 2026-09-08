-- Preserve legacy active/reserved/suspended claims while moving them into the
-- coverage-plan model. This does not create opportunities or change exclusivity;
-- it only groups claims that already belong to the same company and trade.

with legacy_claims as (
  select
    tc.id as territory_claim_id,
    tc.company_id,
    t.trade_category_id,
    tc.status::text as claim_status,
    row_number() over (
      partition by tc.company_id, t.trade_category_id
      order by tc.created_at, tc.id
    ) as position
  from public.territory_claims tc
  join public.territories t on t.id = tc.territory_id
  where tc.status in ('reserved', 'active', 'suspended')
    and not exists (
      select 1
      from public.coverage_plan_items cpi
      where cpi.territory_claim_id = tc.id
    )
),
plan_groups as (
  select
    company_id,
    trade_category_id,
    count(*)::integer as postcode_count,
    case
      when bool_or(claim_status = 'active') then 'active'::public.coverage_plan_status
      when bool_or(claim_status = 'suspended') then 'suspended'::public.coverage_plan_status
      else 'reserved'::public.coverage_plan_status
    end as plan_status
  from legacy_claims
  group by company_id, trade_category_id
)
insert into public.coverage_plans (
  company_id,
  trade_category_id,
  billing_mode,
  status,
  monthly_price_pence
)
select
  pg.company_id,
  pg.trade_category_id,
  'custom'::public.coverage_billing_mode,
  pg.plan_status,
  public.coverage_plan_price(pg.postcode_count, 'custom'::public.coverage_billing_mode, 20)
from plan_groups pg
where not exists (
  select 1
  from public.coverage_plans cp
  where cp.company_id = pg.company_id
    and cp.trade_category_id = pg.trade_category_id
    and cp.status in ('reserved', 'active', 'pending_change', 'suspended')
);

with legacy_claims as (
  select
    tc.id as territory_claim_id,
    tc.company_id,
    t.trade_category_id,
    t.postcode_district,
    row_number() over (
      partition by tc.company_id, t.trade_category_id
      order by tc.created_at, tc.id
    ) as position
  from public.territory_claims tc
  join public.territories t on t.id = tc.territory_id
  where tc.status in ('reserved', 'active', 'suspended')
    and not exists (
      select 1
      from public.coverage_plan_items cpi
      where cpi.territory_claim_id = tc.id
    )
)
insert into public.coverage_plan_items (
  coverage_plan_id,
  territory_claim_id,
  postcode_district,
  unit_monthly_price_pence,
  status
)
select
  cp.id,
  lc.territory_claim_id,
  lc.postcode_district,
  public.coverage_unit_price(lc.position),
  'active'::public.coverage_plan_item_status
from legacy_claims lc
join public.coverage_plans cp
  on cp.company_id = lc.company_id
 and cp.trade_category_id = lc.trade_category_id
 and cp.status in ('reserved', 'active', 'pending_change', 'suspended')
where not exists (
  select 1
  from public.coverage_plan_items cpi
  where cpi.territory_claim_id = lc.territory_claim_id
)
on conflict do nothing;
