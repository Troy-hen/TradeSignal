-- Harden pricing helpers and index the coverage foreign keys introduced by
-- the coverage-plan model.

alter function public.coverage_unit_price(integer) set search_path = public;
alter function public.coverage_plan_price(integer, public.coverage_billing_mode, integer) set search_path = public;

create index if not exists coverage_plans_coverage_area_idx
  on public.coverage_plans (coverage_area_id)
  where coverage_area_id is not null;

create index if not exists coverage_plans_created_by_idx
  on public.coverage_plans (created_by)
  where created_by is not null;

create index if not exists coverage_plans_trade_category_idx
  on public.coverage_plans (trade_category_id);
