-- Demo and non-billed coverage plans can be adjusted without creating a
-- second subscription. Paid plans are deliberately blocked until Stripe
-- subscription item updates are wired; this prevents a UI change from
-- diverging from the amount the customer is billed.

create or replace function public.change_coverage_plan(
  p_coverage_plan_id uuid,
  p_postcode_districts text[]
)
returns table (
  coverage_plan_id uuid,
  monthly_price_pence integer,
  postcode_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.coverage_plans;
  v_company_id uuid;
  v_trade_price integer;
  v_districts text[];
  v_district text;
  v_territory_id uuid;
  v_claim public.territory_claims;
  v_item record;
  v_position integer := 0;
  v_claim_status public.territory_claim_status;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;

  select cp.*
  into v_plan
  from public.coverage_plans cp
  where cp.id = p_coverage_plan_id
    and public.is_company_member(cp.company_id)
  for update;

  if not found then
    raise exception 'coverage_plan_not_found';
  end if;

  if v_plan.status not in ('reserved', 'active', 'suspended') then
    raise exception 'coverage_plan_not_changeable';
  end if;

  if v_plan.stripe_subscription_id is not null then
    raise exception 'paid_coverage_change_requires_billing';
  end if;

  if v_plan.billing_mode <> 'custom' then
    raise exception 'county_coverage_change_requires_billing';
  end if;

  select cm.company_id
  into v_company_id
  from public.company_memberships cm
  where cm.user_id = (select auth.uid())
    and cm.company_id = v_plan.company_id
    and cm.role in ('owner', 'admin')
    and cm.status = 'active'
  limit 1;

  if v_company_id is null then
    raise exception 'no_authorized_company';
  end if;

  select default_monthly_price_pence
  into v_trade_price
  from public.trade_categories
  where id = v_plan.trade_category_id
    and is_active;

  if v_trade_price is null then
    raise exception 'unknown_trade';
  end if;

  select array_agg(district order by district)
  into v_districts
  from (
    select distinct upper(trim(value)) as district
    from unnest(coalesce(p_postcode_districts, array[]::text[])) as value
    where trim(value) <> ''
  ) normalised;

  if v_districts is null or coalesce(array_length(v_districts, 1), 0) < 1 then
    raise exception 'no_postcode_districts';
  end if;

  if array_length(v_districts, 1) > 500 then
    raise exception 'too_many_postcode_districts';
  end if;

  if exists (
    select 1
    from unnest(v_districts) as requested(district)
    where not exists (
      select 1
      from public.postcode_districts pd
      where pd.id = requested.district
    )
  ) then
    raise exception 'unknown_postcode_district';
  end if;

  for v_item in
    select cpi.id, cpi.territory_claim_id, cpi.postcode_district
    from public.coverage_plan_items cpi
    where cpi.coverage_plan_id = v_plan.id
      and cpi.status in ('active', 'pending_add')
  loop
    if not exists (
      select 1
      from unnest(v_districts) as requested(district)
      where requested.district = v_item.postcode_district
    ) then
      update public.territory_claims
      set status = 'cancelled',
          cancelled_at = now()
      where id = v_item.territory_claim_id
        and status in ('reserved', 'active', 'suspended');

      update public.coverage_plan_items
      set status = 'removed',
          effective_until = now(),
          updated_at = now()
      where id = v_item.id;
    end if;
  end loop;

  if v_plan.status = 'reserved' then
    v_claim_status := 'reserved';
  else
    v_claim_status := 'active';
  end if;

  foreach v_district in array v_districts loop
    v_position := v_position + 1;

    select cpi.*
    into v_item
    from public.coverage_plan_items cpi
    where cpi.coverage_plan_id = v_plan.id
      and cpi.postcode_district = v_district
    limit 1;

    if found and v_item.status in ('active', 'pending_add') then
      update public.coverage_plan_items
      set status = 'active',
          unit_monthly_price_pence = public.coverage_unit_price(v_position),
          effective_until = null,
          updated_at = now()
      where id = v_item.id;
    else
      insert into public.territories (
        postcode_district,
        trade_category_id,
        monthly_price_pence
      )
      values (
        v_district,
        v_plan.trade_category_id,
        v_trade_price
      )
      on conflict (postcode_district, trade_category_id) do nothing;

      select id
      into v_territory_id
      from public.territories
      where postcode_district = v_district
        and trade_category_id = v_plan.trade_category_id;

      begin
        insert into public.territory_claims (
          territory_id,
          company_id,
          status,
          reserved_expires_at,
          created_by
        )
        values (
          v_territory_id,
          v_plan.company_id,
          v_claim_status,
          case when v_claim_status = 'reserved' then now() + interval '15 minutes' else null end,
          (select auth.uid())
        )
        returning * into v_claim;
      exception when unique_violation then
        raise exception 'territory_unavailable' using errcode = '23505';
      end;

      if found then
        update public.coverage_plan_items
        set territory_claim_id = v_claim.id,
            status = 'active',
            unit_monthly_price_pence = public.coverage_unit_price(v_position),
            effective_from = now(),
            effective_until = null,
            updated_at = now()
        where id = v_item.id;
      else
        insert into public.coverage_plan_items (
          coverage_plan_id,
          territory_claim_id,
          postcode_district,
          unit_monthly_price_pence
        )
        values (
          v_plan.id,
          v_claim.id,
          v_district,
          public.coverage_unit_price(v_position)
        );
      end if;
    end if;
  end loop;

  update public.coverage_plans
  set monthly_price_pence = public.coverage_plan_price(array_length(v_districts, 1), 'custom'::public.coverage_billing_mode, 20),
      updated_at = now()
  where id = v_plan.id;

  insert into public.audit_logs (
    actor_type,
    actor_id,
    action,
    entity_type,
    entity_id,
    after_state
  )
  values (
    'user',
    (select auth.uid()),
    'coverage_plan.changed',
    'coverage_plan',
    v_plan.id,
    jsonb_build_object(
      'postcode_count', array_length(v_districts, 1),
      'monthly_price_pence', public.coverage_plan_price(array_length(v_districts, 1), 'custom'::public.coverage_billing_mode, 20)
    )
  );

  coverage_plan_id := v_plan.id;
  monthly_price_pence := public.coverage_plan_price(array_length(v_districts, 1), 'custom'::public.coverage_billing_mode, 20);
  postcode_count := array_length(v_districts, 1);
  return next;
end;
$$;

revoke all on function public.change_coverage_plan(uuid, text[]) from public, anon;
grant execute on function public.change_coverage_plan(uuid, text[]) to authenticated;
