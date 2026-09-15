-- Public/free-tier territory functions and the reservation RPC + expiry sweep.

-- Anonymous, aggregate-only. Never returns a row from planning_applications,
-- never an address, never an id — just counts/sums plus territory status/price.
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
    count(*) filter (where ato.opportunity_bucket = 'hot')::int,
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
  where ato.postcode_district = v_district and ato.trade_category_id = v_trade_id and ato.is_active;
end;
$$;
revoke all on function public.check_territory_availability(text, text) from public;
grant execute on function public.check_territory_availability(text, text) to anon, authenticated;

-- Free-tier teaser browsing: any signed-up user, any district+trade, no
-- ownership check. Column list is deliberately the "visible" set only —
-- address/reference/reasoning/scope/timing/outreach stay behind
-- has_active_lead_match on the real tables.
create or replace function public.browse_territory_opportunities(
  p_postcode_district text,
  p_trade_category_id uuid,
  p_limit int default 20
)
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
  received_date date
)
language sql
stable
security definer
set search_path = public
as $$
  select ato.id, ato.opportunity_score, ato.opportunity_bucket, ac.project_type,
         ato.postcode_district, pa.status, ac.estimated_total_project_value_low,
         ac.estimated_total_project_value_high, ato.estimated_trade_value_low,
         ato.estimated_trade_value_high, pa.received_date
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.application_classifications ac on ac.id = ato.application_classification_id
  where ato.postcode_district = upper(trim(p_postcode_district))
    and ato.trade_category_id = p_trade_category_id
    and ato.is_active
  order by ato.opportunity_score desc nulls last
  limit least(p_limit, 50)
$$;
revoke all on function public.browse_territory_opportunities(text, uuid, int) from public;
grant execute on function public.browse_territory_opportunities(text, uuid, int) to authenticated;

-- The reservation RPC. Resolves the caller's company server-side (owner/admin
-- only) — never a client-supplied company_id. The partial unique index on
-- territory_claims is the actual exclusivity guarantee; this function's job
-- is just to surface a clean error on conflict rather than a raw 23505.
create or replace function public.reserve_territory(p_postcode_district text, p_trade_category_id uuid)
returns public.territory_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_district text := upper(trim(p_postcode_district));
  v_territory_id uuid;
  v_default_price int;
  v_claim public.territory_claims;
begin
  select company_id into v_company_id
  from public.company_memberships
  where user_id = (select auth.uid()) and role in ('owner', 'admin') and status = 'active'
  limit 1;

  if v_company_id is null then
    raise exception 'no_authorized_company';
  end if;

  if not exists (select 1 from public.postcode_districts where id = v_district) then
    raise exception 'unknown_postcode_district';
  end if;

  select default_monthly_price_pence into v_default_price
  from public.trade_categories where id = p_trade_category_id and is_active;

  if v_default_price is null then
    raise exception 'unknown_trade';
  end if;

  insert into public.territories (postcode_district, trade_category_id, monthly_price_pence)
  values (v_district, p_trade_category_id, v_default_price)
  on conflict (postcode_district, trade_category_id) do nothing;

  select id into v_territory_id
  from public.territories
  where postcode_district = v_district and trade_category_id = p_trade_category_id;

  begin
    insert into public.territory_claims (territory_id, company_id, status, reserved_expires_at, created_by)
    values (v_territory_id, v_company_id, 'reserved', now() + interval '15 minutes', (select auth.uid()))
    returning * into v_claim;
  exception when unique_violation then
    raise exception 'territory_unavailable' using errcode = '23505';
  end;

  insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, after_state)
  values ('user', (select auth.uid()), 'territory.reserved', 'territory_claim', v_claim.id, to_jsonb(v_claim));

  return v_claim;
end;
$$;
revoke all on function public.reserve_territory(text, uuid) from public;
grant execute on function public.reserve_territory(text, uuid) to authenticated;

-- Guaranteed backstop regardless of webhook delivery — pure SQL, no external
-- I/O, so a pg_cron schedule rather than an Edge Function hop.
create or replace function public.expire_stale_territory_reservations()
returns void
language sql
security definer
set search_path = public
as $$
  update public.territory_claims
  set status = 'expired'
  where status = 'reserved' and reserved_expires_at < now();
$$;
revoke all on function public.expire_stale_territory_reservations() from public;

select cron.schedule(
  'expire-territory-reservations',
  '*/5 * * * *',
  $$select public.expire_stale_territory_reservations();$$
);

-- Daily cleanup of the rate-limit event log (48h retention).
create or replace function public.prune_rate_limit_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_events where created_at < now() - interval '48 hours';
$$;
revoke all on function public.prune_rate_limit_events() from public;

select cron.schedule(
  'prune-rate-limit-events',
  '0 3 * * *',
  $$select public.prune_rate_limit_events();$$
);
