-- Flexible customer coverage plans sit above the existing postcode x trade
-- exclusivity claims. The old claim rows remain the source of truth for locking;
-- this layer owns pricing, bundles, and one subscription per coverage plan.

do $$ begin
  create type public.coverage_billing_mode as enum ('custom', 'county');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.coverage_plan_status as enum ('reserved', 'active', 'pending_change', 'suspended', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.coverage_plan_item_status as enum ('active', 'pending_add', 'pending_remove', 'removed', 'expired');
exception when duplicate_object then null;
end $$;

create table if not exists public.coverage_areas (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name                  text not null,
  area_type             text not null default 'county' check (area_type = 'county'),
  discount_percent      integer not null default 20 check (discount_percent between 0 and 50),
  is_active             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.coverage_area_postcodes (
  coverage_area_id      uuid not null references public.coverage_areas(id) on delete cascade,
  postcode_district     text not null references public.postcode_districts(id),
  created_at            timestamptz not null default now(),
  primary key (coverage_area_id, postcode_district)
);

create index if not exists coverage_area_postcodes_district_idx
  on public.coverage_area_postcodes (postcode_district);

create table if not exists public.coverage_plans (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies(id) on delete cascade,
  trade_category_id     uuid not null references public.trade_categories(id),
  billing_mode          public.coverage_billing_mode not null default 'custom',
  coverage_area_id      uuid references public.coverage_areas(id),
  status                public.coverage_plan_status not null default 'reserved',
  monthly_price_pence   integer not null check (monthly_price_pence > 0),
  currency              text not null default 'GBP',
  stripe_customer_id    text,
  stripe_subscription_id text unique,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  cancelled_at          timestamptz,
  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists coverage_plans_active_company_trade_idx
  on public.coverage_plans (company_id, trade_category_id)
  where status in ('reserved', 'active', 'pending_change', 'suspended');

create index if not exists coverage_plans_company_idx
  on public.coverage_plans (company_id, created_at desc);

create table if not exists public.coverage_plan_items (
  id                    uuid primary key default gen_random_uuid(),
  coverage_plan_id      uuid not null references public.coverage_plans(id) on delete cascade,
  territory_claim_id    uuid not null references public.territory_claims(id),
  postcode_district     text not null references public.postcode_districts(id),
  unit_monthly_price_pence integer not null check (unit_monthly_price_pence > 0),
  status                public.coverage_plan_item_status not null default 'active',
  effective_from        timestamptz not null default now(),
  effective_until      timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (coverage_plan_id, postcode_district),
  unique (territory_claim_id)
);

create index if not exists coverage_plan_items_plan_idx
  on public.coverage_plan_items (coverage_plan_id, status);

create index if not exists coverage_plan_items_postcode_idx
  on public.coverage_plan_items (postcode_district);

alter table public.subscriptions
  add column if not exists coverage_plan_id uuid references public.coverage_plans(id);

alter table public.subscriptions
  alter column territory_claim_id drop not null;

create unique index if not exists subscriptions_coverage_plan_id_idx
  on public.subscriptions (coverage_plan_id)
  where coverage_plan_id is not null;

-- £29.99 core coverage is the common price for every trade; volume pricing
-- belongs to the customer's coverage plan, not the public territory inventory.
update public.trade_categories
set default_monthly_price_pence = 2999,
    updated_at = now();

-- There are no paid subscriptions in the connected project. Keep any future
-- paid territory price grandfathered, while making unbilled inventory/demo
-- rows reflect the new public core price.
update public.territories t
set monthly_price_pence = 2999,
    updated_at = now()
where not exists (
  select 1
  from public.territory_claims tc
  join public.subscriptions s on s.territory_claim_id = tc.id
  where tc.territory_id = t.id
    and s.status in ('trialing', 'active', 'past_due', 'unpaid')
);

create or replace function public.coverage_unit_price(p_position integer)
returns integer
language sql
immutable
strict
as $$
  select case
    when p_position = 1 then 2999
    when p_position between 2 and 3 then 2499
    when p_position between 4 and 6 then 1999
    when p_position between 7 and 10 then 1499
    else 999
  end;
$$;

create or replace function public.coverage_plan_price(
  p_postcode_count integer,
  p_billing_mode public.coverage_billing_mode default 'custom',
  p_discount_percent integer default 20
)
returns integer
language plpgsql
immutable
strict
as $$
declare
  v_subtotal integer;
  v_discount integer := greatest(0, least(coalesce(p_discount_percent, 20), 50));
begin
  if p_postcode_count < 1 or p_postcode_count > 500 then
    raise exception 'invalid_postcode_count';
  end if;

  select coalesce(sum(public.coverage_unit_price(g)), 0)::integer
  into v_subtotal
  from generate_series(1, p_postcode_count) as g;

  if p_billing_mode = 'county' then
    return round(v_subtotal * (100 - v_discount) / 100.0)::integer;
  end if;

  return v_subtotal;
end;
$$;

revoke all on function public.coverage_unit_price(integer) from public, anon, authenticated;
revoke all on function public.coverage_plan_price(integer, public.coverage_billing_mode, integer) from public, anon, authenticated;

create or replace function public.reserve_coverage_plan(
  p_postcode_districts text[],
  p_trade_category_id uuid,
  p_billing_mode public.coverage_billing_mode default 'custom',
  p_coverage_area_id uuid default null
)
returns table (
  coverage_plan_id uuid,
  first_territory_claim_id uuid,
  monthly_price_pence integer,
  postcode_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_trade_price integer;
  v_plan public.coverage_plans;
  v_claim public.territory_claims;
  v_territory_id uuid;
  v_district text;
  v_districts text[];
  v_position integer := 0;
  v_discount integer := 20;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;

  select cm.company_id
  into v_company_id
  from public.company_memberships cm
  where cm.user_id = (select auth.uid())
    and cm.role in ('owner', 'admin')
    and cm.status = 'active'
  order by cm.joined_at nulls last
  limit 1;

  if v_company_id is null then
    raise exception 'no_authorized_company';
  end if;

  select default_monthly_price_pence
  into v_trade_price
  from public.trade_categories
  where id = p_trade_category_id and is_active;

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
      select 1 from public.postcode_districts pd where pd.id = requested.district
    )
  ) then
    raise exception 'unknown_postcode_district';
  end if;

  if p_billing_mode = 'county' then
    if p_coverage_area_id is null then
      raise exception 'coverage_area_required';
    end if;

    select discount_percent
    into v_discount
    from public.coverage_areas
    where id = p_coverage_area_id
      and area_type = 'county'
      and is_active;

    if v_discount is null then
      raise exception 'coverage_area_unavailable';
    end if;

    if exists (
      select postcode_district
      from public.coverage_area_postcodes
      where coverage_area_id = p_coverage_area_id
      except
      select unnest(v_districts)
    ) or exists (
      select unnest(v_districts)
      except
      select postcode_district
      from public.coverage_area_postcodes
      where coverage_area_id = p_coverage_area_id
    ) then
      raise exception 'county_requires_complete_selection';
    end if;
  elsif p_coverage_area_id is not null then
    raise exception 'coverage_area_not_allowed';
  end if;

  if exists (
    select 1
    from public.coverage_plans
    where company_id = v_company_id
      and trade_category_id = p_trade_category_id
      and status in ('reserved', 'active', 'pending_change', 'suspended')
  ) then
    raise exception 'coverage_plan_exists';
  end if;

  insert into public.coverage_plans (
    company_id, trade_category_id, billing_mode, coverage_area_id,
    status, monthly_price_pence, created_by
  )
  values (
    v_company_id, p_trade_category_id, p_billing_mode, p_coverage_area_id,
    'reserved',
    public.coverage_plan_price(array_length(v_districts, 1), p_billing_mode, v_discount),
    (select auth.uid())
  )
  returning * into v_plan;

  foreach v_district in array v_districts loop
    v_position := v_position + 1;

    insert into public.territories (postcode_district, trade_category_id, monthly_price_pence)
    values (v_district, p_trade_category_id, v_trade_price)
    on conflict (postcode_district, trade_category_id) do nothing;

    select id into v_territory_id
    from public.territories
    where postcode_district = v_district
      and trade_category_id = p_trade_category_id;

    begin
      insert into public.territory_claims (
        territory_id, company_id, status, reserved_expires_at, created_by
      )
      values (
        v_territory_id, v_company_id, 'reserved',
        now() + interval '15 minutes', (select auth.uid())
      )
      returning * into v_claim;
    exception when unique_violation then
      raise exception 'territory_unavailable' using errcode = '23505';
    end;

    insert into public.coverage_plan_items (
      coverage_plan_id, territory_claim_id, postcode_district,
      unit_monthly_price_pence
    )
    values (
      v_plan.id, v_claim.id, v_district,
      public.coverage_unit_price(v_position)
    );

    if v_position = 1 then
      first_territory_claim_id := v_claim.id;
    end if;
  end loop;

  insert into public.audit_logs (
    actor_type, actor_id, action, entity_type, entity_id, after_state
  )
  values (
    'user', (select auth.uid()), 'coverage_plan.reserved',
    'coverage_plan', v_plan.id,
    jsonb_build_object(
      'postcode_count', array_length(v_districts, 1),
      'monthly_price_pence', v_plan.monthly_price_pence,
      'billing_mode', p_billing_mode
    )
  );

  coverage_plan_id := v_plan.id;
  monthly_price_pence := v_plan.monthly_price_pence;
  postcode_count := array_length(v_districts, 1);
  return next;
end;
$$;

revoke all on function public.reserve_coverage_plan(text[], uuid, public.coverage_billing_mode, uuid) from public, anon;
grant execute on function public.reserve_coverage_plan(text[], uuid, public.coverage_billing_mode, uuid) to authenticated;

alter table public.coverage_areas enable row level security;
alter table public.coverage_area_postcodes enable row level security;
alter table public.coverage_plans enable row level security;
alter table public.coverage_plan_items enable row level security;

drop policy if exists "coverage_areas_select_active" on public.coverage_areas;
create policy "coverage_areas_select_active"
  on public.coverage_areas for select
  using (is_active = true);

drop policy if exists "coverage_area_postcodes_select_active" on public.coverage_area_postcodes;
create policy "coverage_area_postcodes_select_active"
  on public.coverage_area_postcodes for select
  using (
    exists (
      select 1 from public.coverage_areas ca
      where ca.id = coverage_area_id and ca.is_active
    )
  );

drop policy if exists "coverage_plans_select_member" on public.coverage_plans;
create policy "coverage_plans_select_member"
  on public.coverage_plans for select
  using (public.is_company_member(company_id));

drop policy if exists "coverage_plan_items_select_member" on public.coverage_plan_items;
create policy "coverage_plan_items_select_member"
  on public.coverage_plan_items for select
  using (
    exists (
      select 1
      from public.coverage_plans cp
      where cp.id = coverage_plan_id
        and public.is_company_member(cp.company_id)
    )
  );

grant select on public.coverage_areas, public.coverage_area_postcodes to anon, authenticated;
grant select on public.coverage_plans, public.coverage_plan_items to authenticated;
