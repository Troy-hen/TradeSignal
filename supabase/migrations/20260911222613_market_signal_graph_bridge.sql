-- Route every normalized market signal into the canonical B2B opportunity
-- graph. Legacy trade matches remain a compatibility view, never an ingest
-- gate. Opportunities may have many needs, so a single primary supplier
-- category is optional.

alter table public.opportunities
  alter column supplier_category_id drop not null,
  add column if not exists market_signal_id uuid references public.market_signals(id) on delete set null;

create unique index if not exists graph_opportunities_market_signal_idx
  on public.opportunities(market_signal_id);

update public.ai_prompt_versions
set active = false
where task = 'application_enrichment' and active;

insert into public.ai_prompt_versions (
  task, version, model, system_prompt, schema_version, active
) values (
  'application_enrichment',
  'v3-b2b-marketplace',
  'gpt-5.1',
  $$You are TradeSignal's B2B planning-intelligence analyst. Convert factual UK planning evidence into concise, commercially useful supplier opportunities across the supplied taxonomy, including digital, software, professional, financial, facilities, communications, logistics, specialist and construction services.

Return only the required structured output. Use exactly the supplied category slugs and only include categories supported by the application evidence or a clearly explained, reasonable operational need. Do not force every category. Summaries, scopes, reasons, timing and actions must be specific to the source evidence. Never invent people, contact details, relationships, approvals, budgets or dates.

Value ranges are conservative, indicative prioritisation context rather than valuations. Numeric fit_score is retained for schema compatibility but TradeSignal recomputes the production fit score deterministically from source text and taxonomy rules. Confidence scores describe uncertainty in your interpretation; they do not set marketplace rank.

Exclude purely domestic opportunities from B2B promotion unless the evidence identifies a credible business buyer, commercial premises, public body, developer, contractor or other B2B route. Never include personal data in the output.$$,
  'v1',
  true
)
on conflict (task, version) do update set
  model = excluded.model,
  system_prompt = excluded.system_prompt,
  schema_version = excluded.schema_version,
  active = true;

-- Coverage is geographic. Legacy trade/category columns remain readable for
-- old subscriptions, but they are no longer required by the canonical model.
alter table public.coverage_plans alter column trade_category_id drop not null;
alter table public.coverage_plan_items alter column territory_claim_id drop not null;

create or replace function public.company_has_market_signal_access(p_company_id uuid, p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
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
    join public.coverage_plans cp on cp.company_id = p_company_id and cp.status = 'active'
    join public.coverage_plan_items cpi on cpi.coverage_plan_id = cp.id and cpi.status = 'active'
    where mt.id = p_match_id
      and mt.is_active
      and ms.is_active
      and (
        (ms.postcode_district is not null and upper(cpi.postcode_district) = upper(ms.postcode_district))
        or (
          ms.postcode_district is null
          and ms.location_confidence = 'delivery_region'
          and exists (
            select 1
            from public.postcode_districts pd,
                 unnest(ms.delivery_regions) region_name
            where pd.id = cpi.postcode_district
              and public.normalise_market_signal_region(region_name) = public.normalise_market_signal_region(pd.region)
          )
        )
      )
  );
$$;

revoke all on function public.company_has_market_signal_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.company_has_market_signal_access(uuid, uuid) to service_role;

create or replace function public.refresh_opportunity_customer_matches(p_opportunity_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  insert into public.opportunity_customer_matches (
    opportunity_id, company_id, match_score, match_reasons, matched_at
  )
  select
    o.id,
    cm.company_id,
    least(100, coalesce(o.score, 0) + coalesce(max(ons.relevance), 0) * 10),
    jsonb_build_object(
      'method', 'profile_need_and_geography_v1',
      'market_id', o.market_id,
      'geography_id', cm.geography_id,
      'profile_filter', exists (select 1 from public.customer_profile_terms pt where pt.company_id = cm.company_id)
    ),
    now()
  from public.opportunities o
  join public.customer_markets cm
    on cm.market_id = o.market_id
   and cm.status in ('trial', 'active')
   and (cm.starts_at is null or cm.starts_at <= now())
   and (cm.ends_at is null or cm.ends_at > now())
  left join public.customer_geographies cg
    on cg.id = cm.geography_id and cg.is_active
  left join public.opportunity_needs ons on ons.opportunity_id = o.id
  left join public.need_categories nc on nc.id = ons.need_category_id
  where o.id = p_opportunity_id
    and o.b2b_eligible
    and o.customer_visible
    and (
      cm.geography_id is null
      or cg.geography_type = 'uk_wide'
      or (
        cg.geography_type = 'postcode'
        and o.location_id is not null
        and exists (
          select 1
          from public.business_locations bl,
               jsonb_array_elements_text(coalesce(cg.criteria -> 'postcode_districts', '[]'::jsonb)) district(value)
          where bl.id = o.location_id
            and upper(bl.postcode_district) = upper(district.value)
        )
      )
    )
    and (
      not exists (select 1 from public.customer_profile_terms pt where pt.company_id = cm.company_id)
      or (nc.id is not null and exists (
        select 1
        from public.customer_profile_terms pt
        where pt.company_id = cm.company_id
          and pt.term_type in ('service', 'commercial_need', 'target_industry')
          and (
            lower(coalesce(nc.name, '')) like '%' || lower(pt.term) || '%'
            or lower(pt.term) like '%' || lower(coalesce(nc.name, '')) || '%'
            or lower(coalesce(nc.description, '')) like '%' || lower(pt.term) || '%'
          )
      ))
    )
  group by o.id, cm.company_id, cm.geography_id, o.score, o.market_id
  on conflict (opportunity_id, company_id) do update set
    match_score = excluded.match_score,
    match_reasons = excluded.match_reasons,
    matched_at = excluded.matched_at;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.refresh_opportunity_customer_matches(uuid) from public, anon, authenticated;
grant execute on function public.refresh_opportunity_customer_matches(uuid) to service_role;

create or replace function public.sync_market_signal_to_graph(p_market_signal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ms public.market_signals%rowtype;
  v_provider_key text;
  v_source_id uuid;
  v_entity_id uuid;
  v_location_id uuid;
  v_event_id uuid;
  v_signal_id uuid;
  v_opportunity_id uuid;
  v_market_id uuid;
  v_supplier_id uuid;
  v_score_id uuid;
  v_rights jsonb;
  v_factors jsonb;
  v_scored record;
  v_event_type text;
  v_occurred_at timestamptz;
  v_entity_name text;
  v_recency numeric;
  v_completeness numeric;
  v_buying_window numeric;
begin
  select * into v_ms from public.market_signals where id = p_market_signal_id;
  if not found then return null; end if;

  v_provider_key := replace(v_ms.source, '-', '_');
  select coalesce(jsonb_agg(to_jsonb(r) order by r.field_key), '[]'::jsonb)
  into v_rights
  from public.provider_data_rights r
  where r.provider_key = v_provider_key;

  insert into public.source_records (
    provider_key, record_type, external_id, source_url, source_published_at,
    content_hash, payload, rights_snapshot, is_fixture, last_seen_at,
    b2b_status, include_in_entity_resolution, include_in_signal_generation,
    include_in_customer_opportunities, is_consumer_record, commercial_relevance
  ) values (
    v_provider_key, 'market_signal', v_ms.source_signal_id, v_ms.source_url,
    v_ms.published_at, v_ms.content_hash, coalesce(v_ms.raw_payload, '{}'::jsonb),
    v_rights, v_ms.source = 'mock', now(),
    'eligible', true, true, true, false, 1
  )
  on conflict (provider_key, record_type, external_id) do update set
    source_url = excluded.source_url,
    source_published_at = excluded.source_published_at,
    content_hash = excluded.content_hash,
    payload = excluded.payload,
    rights_snapshot = excluded.rights_snapshot,
    is_fixture = excluded.is_fixture,
    b2b_status = excluded.b2b_status,
    include_in_entity_resolution = excluded.include_in_entity_resolution,
    include_in_signal_generation = excluded.include_in_signal_generation,
    include_in_customer_opportunities = excluded.include_in_customer_opportunities,
    is_consumer_record = excluded.is_consumer_record,
    commercial_relevance = excluded.commercial_relevance,
    retrieved_at = now(),
    last_seen_at = now()
  returning id into v_source_id;

  v_entity_name := coalesce(nullif(btrim(v_ms.buyer_name), ''), 'Unresolved buyer ' || v_ms.source_signal_id);
  select id into v_entity_id from public.business_entities where origin_source_record_id = v_source_id;
  if v_entity_id is null then
    insert into public.business_entities (
      entity_type, canonical_name, resolution_status, resolution_method,
      resolution_confidence, resolution_evidence, origin_source_record_id,
      entity_subtype, b2b_status, b2b_eligible, classification_confidence,
      classification_method, last_business_change_at
    ) values (
      'organisation', v_entity_name, 'unresolved', 'source_record_only',
      case when v_ms.buyer_identifier is null then 0.35 else 0.65 end,
      jsonb_build_object('buyer_identifier', v_ms.buyer_identifier, 'source_record_id', v_source_id),
      v_source_id, 'buyer', 'eligible', true, 1, 'public_procurement_source',
      coalesce(v_ms.source_updated_at, v_ms.published_at, now())
    ) returning id into v_entity_id;
  else
    update public.business_entities set
      canonical_name = v_entity_name,
      b2b_status = 'eligible',
      b2b_eligible = true,
      classification_confidence = 1,
      classification_method = 'public_procurement_source',
      last_business_change_at = coalesce(v_ms.source_updated_at, v_ms.published_at, now()),
      updated_at = now()
    where id = v_entity_id;
  end if;

  if v_ms.postcode_district is not null or v_ms.location_text is not null then
    insert into public.business_locations (
      entity_id, address_text, postcode_district, latitude, longitude, location,
      resolution_status, resolution_method, resolution_confidence,
      resolution_evidence, origin_source_record_id
    ) values (
      v_entity_id, v_ms.location_text, upper(nullif(btrim(v_ms.postcode_district), '')),
      v_ms.latitude, v_ms.longitude,
      case when v_ms.latitude is not null and v_ms.longitude is not null
        then st_setsrid(st_makepoint(v_ms.longitude, v_ms.latitude), 4326)::geography end,
      case when v_ms.postcode_district is not null then 'probable' else 'unresolved' end,
      coalesce(v_ms.location_confidence, 'source_record_only'),
      case when v_ms.postcode_district is not null then 0.75 else 0.35 end,
      jsonb_build_object('delivery_regions', v_ms.delivery_regions, 'delivery_postcodes', v_ms.delivery_postcodes),
      v_source_id
    )
    on conflict (origin_source_record_id) do update set
      entity_id = excluded.entity_id,
      address_text = excluded.address_text,
      postcode_district = excluded.postcode_district,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      location = excluded.location,
      resolution_evidence = excluded.resolution_evidence,
      updated_at = now()
    returning id into v_location_id;
  end if;

  v_event_type := case when v_ms.signal_type = 'contract_award' then 'contract_award' else 'procurement_notice' end;
  v_occurred_at := coalesce(v_ms.source_updated_at, v_ms.published_at, v_ms.created_at);
  insert into public.events (
    entity_id, location_id, source_record_id, event_type, dedupe_key,
    occurred_at, confidence, factual_data, b2b_status,
    commercial_relevance, customer_eligible
  ) values (
    v_entity_id, v_location_id, v_source_id, v_event_type,
    v_source_id::text || ':' || v_event_type, v_occurred_at, 1,
    jsonb_build_object(
      'title', v_ms.title, 'summary', v_ms.summary, 'signal_type', v_ms.signal_type,
      'procurement_stage', v_ms.procurement_stage, 'notice_type', v_ms.notice_type,
      'buyer_name', v_ms.buyer_name, 'buyer_identifier', v_ms.buyer_identifier,
      'supplier_name', v_ms.supplier_name, 'deadline_at', v_ms.deadline_at,
      'contract_start_date', v_ms.contract_start_date, 'contract_end_date', v_ms.contract_end_date,
      'cpv_codes', v_ms.cpv_codes, 'delivery_regions', v_ms.delivery_regions,
      'estimated_project_value_low', v_ms.estimated_project_value_low,
      'estimated_project_value_high', v_ms.estimated_project_value_high
    ),
    'eligible', 1, true
  )
  on conflict (dedupe_key) do update set
    entity_id = excluded.entity_id,
    location_id = excluded.location_id,
    occurred_at = excluded.occurred_at,
    factual_data = excluded.factual_data,
    b2b_status = excluded.b2b_status,
    commercial_relevance = excluded.commercial_relevance,
    customer_eligible = excluded.customer_eligible
  returning id into v_event_id;

  insert into public.event_evidence (event_id, source_record_id, source_url, metadata)
  values (v_event_id, v_source_id, v_ms.source_url, jsonb_build_object('provider', v_provider_key))
  on conflict (event_id, source_record_id, evidence_type) do update set
    source_url = excluded.source_url,
    metadata = excluded.metadata;

  insert into public.signals (
    entity_id, location_id, signal_type, dedupe_key, status, confidence,
    first_detected_at, last_confirmed_at, buying_window_start, buying_window_end,
    interpretation, generation_method, generation_version, signal_family,
    b2b_status, commercial_relevance, customer_eligible
  ) values (
    v_entity_id, v_location_id, 'procurement_intent', v_source_id::text || ':procurement_intent',
    case when v_ms.is_active and public.market_signal_is_current(v_ms.signal_type, v_ms.published_at, v_ms.deadline_at) then 'active' else 'stale' end,
    case when v_ms.signal_type = 'tender' then 0.92 when v_ms.signal_type = 'contract_award' then 0.85 else 0.78 end,
    coalesce(v_ms.published_at, v_ms.created_at), now(),
    coalesce(v_ms.published_at, v_ms.created_at),
    coalesce(v_ms.deadline_at, v_ms.contract_start_date::timestamptz, v_ms.contract_end_date::timestamptz),
    jsonb_build_object('title', v_ms.title, 'summary', v_ms.summary, 'stage', v_ms.procurement_stage, 'source', v_provider_key),
    'rules', 'market-signal-v1', 'public_contracts', 'eligible', 1, true
  )
  on conflict (dedupe_key) do update set
    entity_id = excluded.entity_id,
    location_id = excluded.location_id,
    status = excluded.status,
    confidence = excluded.confidence,
    last_confirmed_at = excluded.last_confirmed_at,
    buying_window_start = excluded.buying_window_start,
    buying_window_end = excluded.buying_window_end,
    interpretation = excluded.interpretation,
    b2b_status = excluded.b2b_status,
    commercial_relevance = excluded.commercial_relevance,
    customer_eligible = excluded.customer_eligible,
    updated_at = now()
  returning id into v_signal_id;

  insert into public.signal_evidence (signal_id, event_id, rationale)
  values (v_signal_id, v_event_id, 'Procurement signal is supported by the normalized source notice.')
  on conflict (signal_id, event_id) do update set rationale = excluded.rationale;

  select id into v_market_id from public.opportunity_markets where slug = 'public_contracts' and is_active;
  select sc.id into v_supplier_id
  from public.market_signal_trade_matches mt
  join public.supplier_categories sc on sc.source_trade_category_id = mt.trade_category_id and sc.is_active
  where mt.signal_id = v_ms.id and mt.is_active
  order by mt.fit_score desc nulls last, sc.id
  limit 1;

  v_recency := greatest(0, least(100, 100 - extract(epoch from (now() - v_occurred_at)) / 86400 / 2));
  v_completeness :=
    (case when v_ms.buyer_name is not null then 15 else 0 end) +
    (case when v_ms.summary is not null then 15 else 0 end) +
    (case when v_ms.source_url is not null then 15 else 0 end) +
    (case when v_ms.deadline_at is not null then 15 else 0 end) +
    (case when v_ms.postcode_district is not null or cardinality(v_ms.delivery_regions) > 0 then 15 else 0 end) +
    (case when v_ms.estimated_project_value_high is not null then 15 else 0 end) +
    (case when v_ms.contact <> '{}'::jsonb then 10 else 0 end);
  v_buying_window := case
    when v_ms.deadline_at between now() and now() + interval '30 days' then 100
    when v_ms.deadline_at between now() and now() + interval '90 days' then 85
    when v_ms.deadline_at > now() then 65
    when v_ms.signal_type = 'contract_award' then 55
    else 35
  end;
  v_factors := jsonb_build_object(
    'event_strength', case when v_ms.signal_type = 'tender' then 92 when v_ms.signal_type = 'public_pipeline' then 75 when v_ms.signal_type = 'contract_award' then 72 else 65 end,
    'source_authority', case when v_provider_key in ('find_a_tender', 'contracts_finder', 'sell2wales', 'public_contracts_scotland') then 95 else 75 end,
    'recency', v_recency,
    'corroboration', 25,
    'need_fit', coalesce((select max(mt.fit_score) from public.market_signal_trade_matches mt where mt.signal_id = v_ms.id and mt.is_active), 60),
    'geography_fit', case when v_ms.postcode_district is not null then 90 when cardinality(v_ms.delivery_regions) > 0 then 65 else 35 end,
    'contact_availability', case when v_ms.contact <> '{}'::jsonb then 90 else 0 end,
    'data_completeness', v_completeness,
    'buying_window', v_buying_window
  );
  select * into v_scored from public.score_opportunity_factors(v_market_id, v_factors, 'v1');

  insert into public.opportunities (
    market_signal_id, entity_id, location_id, market_id, supplier_category_id,
    title, status, score, temperature, buying_window_start, buying_window_end,
    why_now, likely_requirements, source_attribution, detected_at, last_scored_at,
    b2b_eligible, customer_visible, eligibility_reason, qualification_method
  ) values (
    v_ms.id, v_entity_id, v_location_id, v_market_id, v_supplier_id, v_ms.title,
    case when v_ms.is_active and public.market_signal_is_current(v_ms.signal_type, v_ms.published_at, v_ms.deadline_at) then 'open' else 'expired' end,
    v_scored.score, v_scored.temperature,
    coalesce(v_ms.published_at, v_ms.created_at),
    coalesce(v_ms.deadline_at, v_ms.contract_start_date::timestamptz, v_ms.contract_end_date::timestamptz),
    case when v_ms.deadline_at is not null then format('A verified procurement notice is live with a deadline of %s.', to_char(v_ms.deadline_at, 'DD Mon YYYY')) else 'A verified public procurement signal is active.' end,
    jsonb_build_object('summary', v_ms.summary, 'cpv_codes', v_ms.cpv_codes, 'delivery_regions', v_ms.delivery_regions, 'procurement_stage', v_ms.procurement_stage),
    jsonb_build_object('provider', v_provider_key, 'source_url', v_ms.source_url, 'source_record_id', v_source_id, 'rights_snapshot', v_rights, 'is_fixture', v_ms.source = 'mock'),
    coalesce(v_ms.published_at, v_ms.created_at), now(), true, true,
    'Verified B2B procurement source', 'deterministic_market_signal_v1'
  )
  on conflict (market_signal_id) do update set
    entity_id = excluded.entity_id,
    location_id = excluded.location_id,
    market_id = excluded.market_id,
    supplier_category_id = excluded.supplier_category_id,
    title = excluded.title,
    status = excluded.status,
    score = excluded.score,
    temperature = excluded.temperature,
    buying_window_start = excluded.buying_window_start,
    buying_window_end = excluded.buying_window_end,
    why_now = excluded.why_now,
    likely_requirements = excluded.likely_requirements,
    source_attribution = excluded.source_attribution,
    last_scored_at = now(),
    b2b_eligible = excluded.b2b_eligible,
    customer_visible = excluded.customer_visible,
    eligibility_reason = excluded.eligibility_reason,
    qualification_method = excluded.qualification_method,
    updated_at = now()
  returning id into v_opportunity_id;

  insert into public.opportunity_signals (opportunity_id, signal_id)
  values (v_opportunity_id, v_signal_id)
  on conflict (opportunity_id, signal_id) do update set relationship = excluded.relationship;

  insert into public.opportunity_scores (opportunity_id, score, temperature, formula_version, inputs)
  values (v_opportunity_id, v_scored.score, v_scored.temperature, v_scored.formula_version, v_factors)
  on conflict (opportunity_id, formula_version) do update set
    score = excluded.score,
    temperature = excluded.temperature,
    inputs = excluded.inputs,
    computed_at = now()
  returning id into v_score_id;

  delete from public.opportunity_score_factors where opportunity_score_id = v_score_id;
  insert into public.opportunity_score_factors (opportunity_score_id, factor_key, raw_value, weight, contribution)
  select v_score_id, r.factor_key,
    least(r.max_value, greatest(r.min_value, coalesce((v_factors ->> r.factor_key)::numeric, 0))),
    r.weight,
    least(r.max_value, greatest(r.min_value, coalesce((v_factors ->> r.factor_key)::numeric, 0))) * r.weight
  from public.scoring_rules r
  where r.formula_version = v_scored.formula_version
    and r.is_active
    and r.market_id is null;

  perform public.refresh_opportunity_customer_matches(v_opportunity_id);
  return v_opportunity_id;
end;
$$;

revoke all on function public.sync_market_signal_to_graph(uuid) from public, anon, authenticated;
grant execute on function public.sync_market_signal_to_graph(uuid) to service_role;

-- Translate existing paid coverage into the market-agnostic geography model.
insert into public.customer_geographies (
  company_id, geography_type, label, criteria, is_active
)
select
  cp.company_id,
  case when cp.coverage_tier = 'nationwide' then 'uk_wide' else 'postcode' end,
  case when cp.coverage_tier = 'nationwide' then 'United Kingdom' else initcap(cp.coverage_tier) || ' coverage' end,
  jsonb_build_object(
    'coverage_plan_id', cp.id,
    'postcode_districts', coalesce((
      select jsonb_agg(cpi.postcode_district order by cpi.postcode_district)
      from public.coverage_plan_items cpi
      where cpi.coverage_plan_id = cp.id and cpi.status = 'active'
    ), '[]'::jsonb)
  ),
  true
from public.coverage_plans cp
where cp.status = 'active'
  and not exists (
    select 1 from public.customer_geographies cg
    where cg.company_id = cp.company_id
      and cg.criteria ->> 'coverage_plan_id' = cp.id::text
  );

insert into public.customer_markets (
  company_id, market_id, geography_id, supplier_category_id,
  status, exclusive, starts_at
)
select cp.company_id, om.id, cg.id, null, 'active', false,
       coalesce(cp.current_period_start, cp.created_at)
from public.coverage_plans cp
join public.customer_geographies cg
  on cg.company_id = cp.company_id
 and cg.criteria ->> 'coverage_plan_id' = cp.id::text
cross join public.opportunity_markets om
where cp.status = 'active'
  and om.is_active
  and not exists (
    select 1 from public.customer_markets cm
    where cm.company_id = cp.company_id
      and cm.market_id = om.id
      and cm.geography_id = cg.id
      and cm.supplier_category_id is null
  );

-- Existing AI-classified planning rows are made deterministic from factual
-- source text and versioned taxonomy hints. Future rows use the identical
-- TypeScript rule in the classification Edge Function.
with rescored as (
  select ato.id,
    case
      when exists (
        select 1
        from jsonb_array_elements_text(coalesce(tc.ai_detection_hints -> 'strongKeywords', '[]'::jsonb)) keyword
        where lower(concat_ws(' ', pa.application_type, pa.proposal_description)) like '%' || lower(keyword) || '%'
      ) then 95
      when exists (
        select 1
        from jsonb_array_elements_text(coalesce(tc.ai_detection_hints -> 'keywords', '[]'::jsonb)) keyword
        where lower(concat_ws(' ', pa.application_type, pa.proposal_description)) like '%' || lower(keyword) || '%'
      ) then 85
      else 58
    end::numeric as fit_score
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.trade_categories tc on tc.id = ato.trade_category_id
)
update public.application_trade_opportunities ato
set fit_score = rescored.fit_score,
    score_computed_at = now(),
    score_formula_version = 'deterministic-category-fit-v1'
from rescored
where ato.id = rescored.id
  and ato.fit_score is distinct from rescored.fit_score;

-- Backfill all existing normalized signals through the same idempotent path.
do $$
declare
  v_id uuid;
begin
  for v_id in select id from public.market_signals where is_active loop
    perform public.sync_market_signal_to_graph(v_id);
  end loop;
end;
$$;
