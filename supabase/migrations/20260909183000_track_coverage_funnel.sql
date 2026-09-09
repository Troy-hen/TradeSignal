create or replace function public.track_coverage_plan_funnel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'reserved' then
    insert into public.product_events(company_id, event_name, source, metadata)
    values (
      new.company_id,
      'checkout_started',
      'coverage_plan',
      jsonb_build_object(
        'coverage_plan_id', new.id,
        'trade_category_id', new.trade_category_id,
        'monthly_price_pence', new.monthly_price_pence,
        'billing_mode', new.billing_mode
      )
    );
  elsif tg_op = 'UPDATE' and new.status = 'active' and old.status is distinct from 'active' then
    insert into public.product_events(company_id, event_name, source, metadata)
    values (
      new.company_id,
      'checkout_completed',
      'coverage_plan',
      jsonb_build_object(
        'coverage_plan_id', new.id,
        'trade_category_id', new.trade_category_id,
        'monthly_price_pence', new.monthly_price_pence,
        'billing_mode', new.billing_mode
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists coverage_plan_funnel_events on public.coverage_plans;
create trigger coverage_plan_funnel_events
after insert or update of status on public.coverage_plans
for each row execute function public.track_coverage_plan_funnel();
