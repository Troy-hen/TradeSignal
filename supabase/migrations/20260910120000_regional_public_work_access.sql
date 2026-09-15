-- Public procurement notices often identify a delivery region rather than an exact
-- postcode. Exact postcodes remain strictly territory-bound; regional notices are
-- visible only when the company owns an active territory for the same trade in
-- that delivery region. Buyer/HQ addresses are never used as a delivery proxy.

create or replace function public.normalise_market_signal_region(p_region text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(btrim(coalesce(p_region, '')))
    when 'north west' then 'north west england'
    when 'north east' then 'north east england'
    when 'south east' then 'south east england'
    when 'south west' then 'south west england'
    else lower(btrim(coalesce(p_region, '')))
  end
$$;

create or replace function public.company_has_market_signal_access(p_company_id uuid, p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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
$$;

revoke all on function public.normalise_market_signal_region(text) from public, anon, authenticated;
revoke all on function public.company_has_market_signal_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.normalise_market_signal_region(text) to service_role;
grant execute on function public.company_has_market_signal_access(uuid, uuid) to service_role;

create or replace function public.browse_owned_market_signals_v2(p_limit integer default 100)
returns table(
  market_signal_trade_match_id uuid,
  signal_type text,
  title text,
  postcode_district text,
  location_label text,
  location_scope text,
  trade_name text,
  trade_slug text,
  procurement_stage text,
  buyer_name text,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  deadline_at timestamptz,
  published_at timestamptz,
  fit_score numeric,
  opportunity_bucket text,
  recommended_action text,
  source_url text,
  current_action text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select cm.company_id into v_company_id
  from public.company_memberships cm
  where cm.user_id = auth.uid() and cm.status = 'active'
  order by cm.created_at
  limit 1;

  if v_company_id is null then return; end if;

  return query
  select
    mt.id,
    ms.signal_type,
    ms.title,
    ms.postcode_district,
    case
      when ms.postcode_district is not null then ms.postcode_district
      else coalesce(nullif(array_to_string(ms.delivery_regions, ', '), ''), nullif(ms.location_text, ''), 'Regional opportunity')
    end as location_label,
    case when ms.postcode_district is not null then 'exact' else 'regional' end as location_scope,
    tc.name,
    tc.slug,
    coalesce(ms.procurement_stage, ms.notice_type),
    ms.buyer_name,
    mt.estimated_trade_value_low,
    mt.estimated_trade_value_high,
    ms.deadline_at,
    ms.published_at,
    mt.fit_score,
    mt.opportunity_bucket,
    mt.recommended_action,
    ms.source_url,
    coalesce(st.current_action, 'new')
  from public.market_signal_trade_matches mt
  join public.market_signals ms on ms.id = mt.signal_id
  join public.trade_categories tc on tc.id = mt.trade_category_id
  left join public.market_signal_company_states st
    on st.market_signal_trade_match_id = mt.id and st.company_id = v_company_id
  where mt.is_active
    and ms.is_active
    and coalesce(mt.fit_score, 0) >= 50
    and public.market_signal_is_current(ms.signal_type, ms.published_at, ms.deadline_at)
    and public.company_has_market_signal_access(v_company_id, mt.id)
  order by coalesce(mt.fit_score, 0) desc, ms.deadline_at asc nulls last, ms.published_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

revoke all on function public.browse_owned_market_signals_v2(integer) from public, anon;
grant execute on function public.browse_owned_market_signals_v2(integer) to authenticated;

create or replace function public.get_owned_market_signal(p_match_id uuid)
returns table(
  market_signal_trade_match_id uuid,
  signal_id uuid,
  signal_type text,
  title text,
  summary text,
  location_text text,
  postcode_district text,
  trade_name text,
  trade_slug text,
  project_value_low numeric,
  project_value_high numeric,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  fit_score numeric,
  opportunity_bucket text,
  match_reasons text[],
  recommended_action text,
  procurement_stage text,
  notice_type text,
  buyer_name text,
  buyer_identifier text,
  supplier_name text,
  deadline_at timestamptz,
  contract_start_date date,
  contract_end_date date,
  cpv_codes text[],
  contact jsonb,
  source text,
  source_url text,
  external_ocid text,
  published_at timestamptz,
  current_action text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select cm.company_id into v_company_id
  from public.company_memberships cm
  where cm.user_id = auth.uid() and cm.status = 'active'
  order by cm.created_at
  limit 1;

  if v_company_id is null then return; end if;

  return query
  select
    mt.id, ms.id, ms.signal_type, ms.title, ms.summary,
    case
      when ms.postcode_district is null and coalesce(array_length(ms.delivery_regions, 1), 0) > 0
        then array_to_string(ms.delivery_regions, ', ')
      else ms.location_text
    end,
    ms.postcode_district,
    tc.name, tc.slug, ms.estimated_project_value_low, ms.estimated_project_value_high,
    mt.estimated_trade_value_low, mt.estimated_trade_value_high, mt.fit_score, mt.opportunity_bucket,
    mt.match_reasons, mt.recommended_action, coalesce(ms.procurement_stage, ms.notice_type), ms.notice_type,
    ms.buyer_name, ms.buyer_identifier, ms.supplier_name, ms.deadline_at, ms.contract_start_date,
    ms.contract_end_date, ms.cpv_codes, ms.contact, ms.source, ms.source_url, ms.external_ocid,
    ms.published_at, coalesce(st.current_action, 'new')
  from public.market_signal_trade_matches mt
  join public.market_signals ms on ms.id = mt.signal_id
  join public.trade_categories tc on tc.id = mt.trade_category_id
  left join public.market_signal_company_states st
    on st.market_signal_trade_match_id = mt.id and st.company_id = v_company_id
  where mt.id = p_match_id
    and mt.is_active
    and ms.is_active
    and public.company_has_market_signal_access(v_company_id, mt.id)
  limit 1;
end;
$$;

create or replace function public.set_market_signal_action(
  p_match_id uuid,
  p_action text,
  p_contract_value_gbp numeric default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_action not in ('new','saved','contacted','quoted','won','lost','bid_planned','bid_submitted','awarded') then raise exception 'invalid_action'; end if;

  select cm.company_id into v_company_id
  from public.company_memberships cm
  where cm.user_id = auth.uid() and cm.status = 'active'
  order by cm.created_at
  limit 1;

  if v_company_id is null then raise exception 'company_required'; end if;
  if not public.company_has_market_signal_access(v_company_id, p_match_id) then raise exception 'not_entitled'; end if;

  insert into public.market_signal_company_states(
    company_id, market_signal_trade_match_id, current_action, contract_value_gbp, note,
    first_viewed_at, contacted_at, quoted_at, won_at, lost_at, updated_at
  )
  values(
    v_company_id, p_match_id, p_action, p_contract_value_gbp, nullif(btrim(p_note), ''),
    case when p_action = 'new' then v_now else null end,
    case when p_action = 'contacted' then v_now else null end,
    case when p_action = 'quoted' then v_now else null end,
    case when p_action in ('won','awarded') then v_now else null end,
    case when p_action = 'lost' then v_now else null end,
    v_now
  )
  on conflict(company_id, market_signal_trade_match_id) do update set
    current_action = excluded.current_action,
    contract_value_gbp = coalesce(excluded.contract_value_gbp, public.market_signal_company_states.contract_value_gbp),
    note = coalesce(excluded.note, public.market_signal_company_states.note),
    first_viewed_at = coalesce(public.market_signal_company_states.first_viewed_at, excluded.first_viewed_at),
    contacted_at = coalesce(excluded.contacted_at, public.market_signal_company_states.contacted_at),
    quoted_at = coalesce(excluded.quoted_at, public.market_signal_company_states.quoted_at),
    won_at = coalesce(excluded.won_at, public.market_signal_company_states.won_at),
    lost_at = coalesce(excluded.lost_at, public.market_signal_company_states.lost_at),
    updated_at = v_now;
end;
$$;
