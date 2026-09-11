-- B2B buying-intent controls for the canonical graph.
-- Providers contribute evidence; configurable eligibility and signal rules
-- decide whether that evidence can become a customer-facing opportunity.

create table if not exists public.intelligence_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.provider_config(provider_key) on delete restrict,
  run_type text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_seen integer not null default 0 check (records_seen >= 0),
  records_accepted integer not null default 0 check (records_accepted >= 0),
  records_rejected integer not null default 0 check (records_rejected >= 0),
  records_failed integer not null default 0 check (records_failed >= 0),
  opportunities_created integer not null default 0 check (opportunities_created >= 0),
  metadata jsonb not null default '{}'::jsonb,
  error_summary text,
  created_at timestamptz not null default now()
);

create index if not exists intelligence_ingestion_runs_provider_idx
  on public.intelligence_ingestion_runs(provider_key, started_at desc);

alter table public.provider_usage
  add column if not exists ingestion_run_id uuid references public.intelligence_ingestion_runs(id) on delete set null,
  add column if not exists endpoint text,
  add column if not exists records_matched integer not null default 0,
  add column if not exists records_failed integer not null default 0,
  add column if not exists credits_used numeric,
  add column if not exists customer_revenue_pence integer;

create table if not exists public.source_record_links (
  id uuid primary key default gen_random_uuid(),
  source_record_id uuid not null references public.source_records(id) on delete cascade,
  entity_id uuid references public.business_entities(id) on delete cascade,
  location_id uuid references public.business_locations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  signal_id uuid references public.signals(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  link_type text not null,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (num_nonnulls(entity_id, location_id, event_id, signal_id, opportunity_id) = 1)
);

create index if not exists source_record_links_source_idx on public.source_record_links(source_record_id);
create index if not exists source_record_links_opportunity_idx on public.source_record_links(opportunity_id) where opportunity_id is not null;

create table if not exists public.b2b_source_eligibility_rules (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.provider_config(provider_key) on delete cascade,
  record_type text not null,
  b2b_status text not null check (b2b_status in ('eligible', 'signal_only', 'contact_only', 'review', 'ineligible')),
  include_in_entity_resolution boolean not null default false,
  include_in_signal_generation boolean not null default false,
  include_in_customer_opportunities boolean not null default false,
  exclude_if_domestic boolean not null default false,
  priority integer not null default 100,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_key, record_type)
);

create table if not exists public.intelligence_signal_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  provider_key text references public.provider_config(provider_key) on delete set null,
  event_type text not null,
  signal_type text not null,
  signal_family text not null,
  can_qualify_existing_business boolean not null default true,
  minimum_confidence numeric(4,3) not null default 0.5 check (minimum_confidence between 0 and 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intelligence_signal_rules_event_idx
  on public.intelligence_signal_rules(event_type, is_active);

alter table public.provider_config
  add column if not exists provider_category text,
  add column if not exists environment text not null default 'server',
  add column if not exists priority integer not null default 100,
  add column if not exists supports_company_enrichment boolean not null default false,
  add column if not exists supports_contact_enrichment boolean not null default false,
  add column if not exists supports_events boolean not null default false,
  add column if not exists supports_property boolean not null default false,
  add column if not exists supports_technographics boolean not null default false,
  add column if not exists supports_jobs boolean not null default false,
  add column if not exists b2b_only boolean not null default true,
  add column if not exists customer_display_allowed boolean not null default false,
  add column if not exists crm_export_allowed boolean not null default false,
  add column if not exists cost_model text,
  add column if not exists request_cost numeric,
  add column if not exists monthly_budget numeric,
  add column if not exists daily_request_limit integer,
  add column if not exists last_successful_run timestamptz,
  add column if not exists health_status text not null default 'not_configured';

alter table public.source_records
  add column if not exists b2b_status text not null default 'review',
  add column if not exists include_in_entity_resolution boolean not null default false,
  add column if not exists include_in_signal_generation boolean not null default false,
  add column if not exists include_in_customer_opportunities boolean not null default false,
  add column if not exists is_consumer_record boolean not null default false,
  add column if not exists commercial_relevance numeric(4,3),
  add column if not exists ingestion_run_id uuid references public.intelligence_ingestion_runs(id) on delete set null;

alter table public.business_entities
  add column if not exists entity_subtype text,
  add column if not exists b2b_status text not null default 'review',
  add column if not exists b2b_eligible boolean not null default false,
  add column if not exists classification_confidence numeric(4,3),
  add column if not exists classification_method text,
  add column if not exists last_business_change_at timestamptz;

alter table public.events
  add column if not exists b2b_status text not null default 'review',
  add column if not exists commercial_relevance numeric(4,3),
  add column if not exists customer_eligible boolean not null default false;

alter table public.signals
  add column if not exists signal_family text,
  add column if not exists b2b_status text not null default 'review',
  add column if not exists commercial_relevance numeric(4,3),
  add column if not exists customer_eligible boolean not null default false;

alter table public.opportunities
  add column if not exists b2b_eligible boolean not null default false,
  add column if not exists customer_visible boolean not null default false,
  add column if not exists eligibility_reason text,
  add column if not exists qualification_method text;

alter table public.contact_points
  add column if not exists is_professional boolean not null default false,
  add column if not exists suppression_status text not null default 'clear',
  add column if not exists data_rights jsonb not null default '{}'::jsonb;

alter table public.customer_profiles
  add column if not exists normalization_status text not null default 'pending',
  add column if not exists normalized_at timestamptz,
  add column if not exists normalization_provider text,
  add column if not exists normalization_error text,
  add column if not exists profile_version integer not null default 1;

create table if not exists public.business_entity_identifiers (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id) on delete cascade,
  identifier_type text not null,
  identifier_value text not null,
  provider_key text references public.provider_config(provider_key) on delete set null,
  source_record_id uuid references public.source_records(id) on delete set null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (identifier_type, identifier_value)
);

create table if not exists public.business_entity_profiles (
  entity_id uuid primary key references public.business_entities(id) on delete cascade,
  sic_codes text[] not null default '{}',
  industry text,
  employee_count integer,
  employee_count_at timestamptz,
  description text,
  profile jsonb not null default '{}'::jsonb,
  provider_key text references public.provider_config(provider_key) on delete set null,
  source_record_id uuid references public.source_records(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.business_domains (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id) on delete cascade,
  domain text not null,
  provider_key text references public.provider_config(provider_key) on delete set null,
  source_record_id uuid references public.source_records(id) on delete set null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (entity_id, domain)
);

create table if not exists public.business_properties (
  id uuid primary key default gen_random_uuid(),
  uprn text,
  address_text text,
  postcode text,
  property_type text,
  is_commercial boolean not null default false,
  occupancy_status text,
  title_relationship jsonb not null default '{}'::jsonb,
  provider_key text references public.provider_config(provider_key) on delete set null,
  source_record_id uuid references public.source_records(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (provider_key, uprn)
);

create table if not exists public.business_entity_properties (
  entity_id uuid not null references public.business_entities(id) on delete cascade,
  property_id uuid not null references public.business_properties(id) on delete cascade,
  relationship text not null default 'occupier',
  confidence numeric(4,3),
  created_at timestamptz not null default now(),
  primary key (entity_id, property_id, relationship)
);

create table if not exists public.customer_profile_terms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  term_type text not null check (term_type in ('service', 'target_industry', 'commercial_need', 'signal_family', 'exclusion')),
  term text not null,
  confidence numeric(4,3),
  source text not null default 'ai_normalized',
  created_at timestamptz not null default now(),
  unique (company_id, term_type, term)
);

create index if not exists customer_profile_terms_company_idx on public.customer_profile_terms(company_id, term_type);
-- Provider catalog. These rows describe capabilities and operating controls;
-- they do not create a lead and stay disabled until credentials and rights are
-- configured.
insert into public.provider_config (provider_key, display_name, adapter_key, enabled, essential, config)
values
  ('companies_house_streams', 'Companies House Streaming API', 'companies-house-streams', false, true, '{}'::jsonb),
  ('companies_house_bulk', 'Companies House bulk data', 'companies-house-bulk', false, false, '{}'::jsonb),
  ('hmlr_corporate', 'HM Land Registry corporate property', 'hmlr-corporate', false, false, '{}'::jsonb),
  ('hmlr_leases', 'HM Land Registry registered leases', 'hmlr-leases', false, false, '{}'::jsonb),
  ('epc_non_domestic', 'Government non-domestic EPC', 'epc-non-domestic', false, false, '{}'::jsonb),
  ('pdl', 'People Data Labs', 'people-data-labs', false, false, '{}'::jsonb)
on conflict (provider_key) do update set display_name = excluded.display_name, adapter_key = excluded.adapter_key, updated_at = now();

update public.provider_config
set provider_category = case
  when provider_key in ('companies_house', 'companies_house_streams', 'companies_house_bulk') then 'authoritative_business_registry'
  when provider_key in ('fsa_fhrs', 'cqc', 'nhs_ods') then 'regulatory_establishment'
  when provider_key in ('epc', 'epc_non_domestic', 'planning_data', 'plota', 'hmlr_corporate', 'hmlr_leases', 'nimbus') then 'commercial_property'
  when provider_key in ('find_a_tender', 'contracts_finder') then 'procurement'
  when provider_key in ('adzuna', 'coresignal', 'beauhurst', 'dealroom') then 'business_growth'
  when provider_key = 'wappalyzer' then 'technographics'
  when provider_key in ('people_data_labs', 'pdl', 'hunter', 'apollo', 'cognism') then 'company_professional_enrichment'
  when provider_key in ('google_places', 'ideal_postcodes') then 'location'
  else coalesce(provider_category, 'other')
end,
supports_company_enrichment = provider_key in ('companies_house', 'companies_house_streams', 'companies_house_bulk', 'pdl', 'people_data_labs', 'apollo', 'cognism', 'google_places'),
supports_contact_enrichment = provider_key in ('pdl', 'people_data_labs', 'hunter', 'apollo', 'cognism'),
supports_events = provider_key not in ('ideal_postcodes', 'google_places', 'hunter', 'pdl', 'people_data_labs', 'apollo', 'cognism'),
supports_property = provider_key in ('epc', 'epc_non_domestic', 'planning_data', 'plota', 'hmlr_corporate', 'hmlr_leases', 'nimbus', 'google_places'),
supports_technographics = provider_key = 'wappalyzer',
supports_jobs = provider_key in ('adzuna', 'coresignal'),
b2b_only = true,
health_status = case when enabled then 'configured' else 'not_configured' end,
config = config || jsonb_build_object('buyer_scope', 'business')
where true;

insert into public.provider_data_rights (provider_key, field_key, internal_use_only, customer_display_allowed, customer_export_allowed, crm_export_allowed, cache_allowed, attribution_required, notes)
select provider_key, '*', true, false, false, false, false, true, 'Rights review required before customer display or export.'
from public.provider_config
on conflict (provider_key, field_key) do nothing;

insert into public.b2b_source_eligibility_rules (provider_key, record_type, b2b_status, include_in_entity_resolution, include_in_signal_generation, include_in_customer_opportunities, exclude_if_domestic, notes)
values
  ('companies_house', 'company', 'eligible', true, true, true, false, 'Legal business identity; registered office is not automatically a trading site.'),
  ('companies_house_streams', 'company_change', 'eligible', true, true, true, false, 'Company changes can corroborate an existing business buying window.'),
  ('companies_house_bulk', 'company', 'eligible', true, true, true, false, 'Bulk identity and filing history only.'),
  ('fsa_fhrs', 'establishment', 'eligible', true, true, true, false, 'Business establishment, not diners or consumers.'),
  ('cqc', 'provider', 'eligible', true, true, true, false, 'Healthcare or care organisation.'),
  ('nhs_ods', 'organisation', 'eligible', true, true, true, false, 'Healthcare organisation and site identity.'),
  ('epc', 'non_domestic_epc', 'eligible', true, true, true, true, 'Only non-domestic EPC records qualify.'),
  ('epc', 'domestic_epc', 'ineligible', false, false, false, true, 'Domestic energy records never become customer opportunities.'),
  ('epc_non_domestic', 'certificate', 'eligible', true, true, true, true, 'Commercial premises energy evidence.'),
  ('planning_data', 'commercial_planning', 'eligible', true, true, true, true, 'Commercial development or premises change.'),
  ('plota', 'commercial_planning', 'eligible', true, true, true, true, 'Commercial development or premises change.'),
  ('planning_data', 'householder_planning', 'ineligible', false, false, false, true, 'Domestic extensions and alterations are excluded.'),
  ('plota', 'householder_planning', 'ineligible', false, false, false, true, 'Domestic extensions and alterations are excluded.'),
  ('hmlr_corporate', 'corporate_property', 'eligible', true, true, true, true, 'Corporate commercial property only.'),
  ('hmlr_leases', 'commercial_lease', 'eligible', true, true, true, true, 'Commercial lease evidence only.'),
  ('hmlr_corporate', 'private_homeowner', 'ineligible', false, false, false, true, 'Do not build homeowner profiles.'),
  ('nimbus', 'commercial_property', 'eligible', true, true, true, true, 'Commercial property identity and change.'),
  ('find_a_tender', 'procurement_notice', 'eligible', true, true, true, false, 'Organisation procurement intent.'),
  ('contracts_finder', 'contract_notice', 'eligible', true, true, true, false, 'Organisation procurement intent.'),
  ('adzuna', 'job_posting', 'signal_only', false, true, false, false, 'Business hiring activity; never job-seeker profiles.'),
  ('coresignal', 'company_growth', 'signal_only', true, true, false, false, 'Company-level headcount and growth evidence.'),
  ('beauhurst', 'company_growth', 'signal_only', true, true, false, false, 'Company funding and growth evidence.'),
  ('dealroom', 'company_growth', 'signal_only', true, true, false, false, 'Company funding and growth evidence.'),
  ('wappalyzer', 'business_technology', 'signal_only', true, true, false, false, 'Business technographics only.'),
  ('people_data_labs', 'professional_contact', 'contact_only', false, false, false, false, 'Selective downstream professional enrichment.'),
  ('pdl', 'professional_contact', 'contact_only', false, false, false, false, 'Selective downstream professional enrichment.'),
  ('hunter', 'work_email', 'contact_only', false, false, false, false, 'Professional work email only after qualification.'),
  ('apollo', 'professional_contact', 'contact_only', false, false, false, false, 'Fallback professional enrichment after qualification.'),
  ('cognism', 'professional_contact', 'contact_only', false, false, false, false, 'Premium professional enrichment after qualification.'),
  ('google_places', 'business_place', 'eligible', true, true, true, false, 'Business location verification; respect storage terms.'),
  ('ideal_postcodes', 'business_address', 'eligible', true, true, true, false, 'Commercial address normalisation and geography.'),
  ('mock', '*', 'ineligible', false, false, false, false, 'Synthetic fixture data is never production opportunity inventory.')
on conflict (provider_key, record_type) do update set
  b2b_status = excluded.b2b_status,
  include_in_entity_resolution = excluded.include_in_entity_resolution,
  include_in_signal_generation = excluded.include_in_signal_generation,
  include_in_customer_opportunities = excluded.include_in_customer_opportunities,
  exclude_if_domestic = excluded.exclude_if_domestic,
  notes = excluded.notes,
  updated_at = now();
insert into public.intelligence_signal_rules (rule_key, event_type, signal_type, signal_family, can_qualify_existing_business)
values
  ('company_incorporated', 'company_incorporated', 'business_opening', 'business_change', false),
  ('registered_office_changed', 'registered_office_changed', 'business_move', 'business_change', true),
  ('new_trading_location', 'new_trading_location', 'business_move', 'moves_fitouts', true),
  ('commercial_property_acquired', 'commercial_property_acquired', 'commercial_premises_change', 'moves_fitouts', true),
  ('commercial_lease_registered', 'commercial_lease_registered', 'commercial_premises_change', 'moves_fitouts', true),
  ('new_commercial_premises', 'new_commercial_premises', 'commercial_premises_change', 'moves_fitouts', true),
  ('commercial_planning_submitted', 'commercial_planning_submitted', 'commercial_change', 'moves_fitouts', true),
  ('commercial_planning_approved', 'commercial_planning_approved', 'commercial_change', 'moves_fitouts', true),
  ('commercial_refurbishment', 'commercial_refurbishment', 'commercial_refurbishment', 'moves_fitouts', true),
  ('commercial_fitout', 'commercial_fitout', 'commercial_fitout', 'moves_fitouts', true),
  ('commercial_expansion', 'commercial_expansion', 'commercial_expansion', 'moves_fitouts', true),
  ('commercial_epc_created', 'commercial_epc_created', 'commercial_energy_change', 'commercial_energy', true),
  ('commercial_epc_updated', 'commercial_epc_updated', 'commercial_energy_change', 'commercial_energy', true),
  ('commercial_energy_rating_changed', 'commercial_energy_rating_changed', 'commercial_energy_change', 'commercial_energy', true),
  ('commercial_retrofit_signal', 'commercial_retrofit_signal', 'commercial_retrofit', 'commercial_energy', true),
  ('business_hiring_detected', 'business_hiring_detected', 'business_growth', 'growing_businesses', true),
  ('hiring_velocity_increased', 'hiring_velocity_increased', 'business_growth', 'growing_businesses', true),
  ('new_location_hiring', 'new_location_hiring', 'business_growth', 'growing_businesses', true),
  ('management_hiring_detected', 'management_hiring_detected', 'business_growth', 'growing_businesses', true),
  ('funding_received', 'funding_received', 'business_growth', 'growing_businesses', true),
  ('grant_received', 'grant_received', 'business_growth', 'growing_businesses', true),
  ('acquisition', 'acquisition', 'business_growth', 'growing_businesses', true),
  ('rapid_growth_signal', 'rapid_growth_signal', 'business_growth', 'growing_businesses', true),
  ('technology_added', 'technology_added', 'technology_change', 'growing_businesses', true),
  ('technology_removed', 'technology_removed', 'technology_change', 'growing_businesses', true),
  ('technology_gap_detected', 'technology_gap_detected', 'technology_gap', 'growing_businesses', true),
  ('cqc_provider_registered', 'cqc_provider_registered', 'care_health_change', 'care_health', true),
  ('cqc_location_added', 'cqc_location_added', 'care_health_change', 'care_health', true),
  ('provider_status_changed', 'provider_status_changed', 'care_health_change', 'care_health', true),
  ('procurement_notice', 'procurement_notice', 'procurement_intent', 'public_contracts', true),
  ('contract_award', 'contract_award', 'procurement_intent', 'public_contracts', true)
on conflict (rule_key) do update set signal_type = excluded.signal_type, signal_family = excluded.signal_family, can_qualify_existing_business = excluded.can_qualify_existing_business, updated_at = now();

-- Company profiles remain free text at the boundary; normalisation writes
-- controlled terms separately so matching can use them without losing the
-- customer's original wording.
create or replace function public.replace_customer_profile_terms(p_company_id uuid, p_terms jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.customer_profile_terms where company_id = p_company_id;
  insert into public.customer_profile_terms (company_id, term_type, term, confidence, source)
  select p_company_id, item ->> 'term_type', item ->> 'term', nullif(item ->> 'confidence', '')::numeric, coalesce(item ->> 'source', 'ai_normalized')
  from jsonb_array_elements(coalesce(p_terms, '[]'::jsonb)) item
  where item ->> 'term_type' in ('service', 'target_industry', 'commercial_need', 'signal_family', 'exclusion')
    and nullif(btrim(item ->> 'term'), '') is not null
  on conflict (company_id, term_type, term) do update set confidence = excluded.confidence, source = excluded.source;
end;
$$;

revoke all on function public.replace_customer_profile_terms(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_customer_profile_terms(uuid, jsonb) to service_role;

-- No opportunity can become customer-visible without an eligible organisation.
create or replace function public.enforce_b2b_opportunity_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_eligible boolean;
  v_fixture boolean;
begin
  select b2b_eligible into v_entity_eligible from public.business_entities where id = new.entity_id;
  v_fixture := coalesce((new.source_attribution ->> 'is_fixture')::boolean, false);
  if coalesce(v_entity_eligible, false) then
    new.b2b_eligible := true;
    if new.eligibility_reason is null then new.eligibility_reason := 'b2b_entity_classified'; end if;
  end if;
  if v_fixture then new.b2b_eligible := false; end if;
  if not new.b2b_eligible then new.customer_visible := false; end if;
  if new.customer_visible and not new.b2b_eligible then
    raise exception 'Customer opportunities must resolve to an eligible B2B entity';
  end if;
  return new;
end;
$$;

drop trigger if exists b2b_opportunity_visibility_guard on public.opportunities;
create trigger b2b_opportunity_visibility_guard
before insert or update on public.opportunities
for each row execute function public.enforce_b2b_opportunity_visibility();

create or replace function public.guard_b2b_customer_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visible boolean;
begin
  select customer_visible and b2b_eligible into v_visible from public.opportunities where id = new.opportunity_id;
  if not coalesce(v_visible, false) then return null; end if;
  return new;
end;
$$;

drop trigger if exists b2b_customer_match_guard on public.opportunity_customer_matches;
create trigger b2b_customer_match_guard
before insert or update on public.opportunity_customer_matches
for each row execute function public.guard_b2b_customer_match();
-- Existing commercial planning graph rows are retained and promoted only when
-- the source evidence explicitly identifies a commercial/business context.
update public.business_entities e
set b2b_status = 'eligible',
    b2b_eligible = true,
    classification_confidence = greatest(coalesce(classification_confidence, 0), 0.85),
    classification_method = coalesce(classification_method, 'commercial_source_evidence'),
    last_business_change_at = greatest(last_business_change_at, e.updated_at)
where exists (
  select 1 from public.events ev
  where ev.entity_id = e.id
    and lower(coalesce(ev.factual_data ->> 'is_commercial', 'false')) = 'true'
);

update public.source_records sr
set b2b_status = coalesce(rule.b2b_status, sr.b2b_status),
    include_in_entity_resolution = coalesce(rule.include_in_entity_resolution, sr.include_in_entity_resolution),
    include_in_signal_generation = coalesce(rule.include_in_signal_generation, sr.include_in_signal_generation),
    include_in_customer_opportunities = coalesce(rule.include_in_customer_opportunities, sr.include_in_customer_opportunities),
    is_consumer_record = coalesce(rule.b2b_status, sr.b2b_status) = 'ineligible'
from lateral (
  select r.* from public.b2b_source_eligibility_rules r
  where r.provider_key = sr.provider_key and (r.record_type = sr.record_type or r.record_type = '*')
  order by (r.record_type = sr.record_type) desc, r.priority desc
  limit 1
) rule;

update public.events ev
set b2b_status = case when lower(coalesce(ev.factual_data ->> 'is_commercial', 'false')) = 'true' then 'eligible' else 'review' end,
    customer_eligible = lower(coalesce(ev.factual_data ->> 'is_commercial', 'false')) = 'true',
    commercial_relevance = case when lower(coalesce(ev.factual_data ->> 'is_commercial', 'false')) = 'true' then 0.85 else null end;

update public.signals s
set b2b_status = ev.b2b_status,
    customer_eligible = ev.customer_eligible,
    commercial_relevance = ev.commercial_relevance,
    signal_family = coalesce((select r.signal_family from public.intelligence_signal_rules r where r.event_type = ev.event_type and r.is_active order by r.minimum_confidence desc limit 1), signal_family)
from public.signal_evidence se
join public.events ev on ev.id = se.event_id
where se.signal_id = s.id;

update public.opportunities o
set b2b_eligible = true,
    customer_visible = true,
    eligibility_reason = 'commercial_source_evidence',
    qualification_method = 'canonical_b2b_guard'
where exists (select 1 from public.business_entities e where e.id = o.entity_id and e.b2b_eligible)
  and not coalesce((o.source_attribution ->> 'is_fixture')::boolean, false)
  and exists (
    select 1 from public.opportunity_signals os
    join public.signals s on s.id = os.signal_id
    where os.opportunity_id = o.id and s.customer_eligible
  );

delete from public.opportunity_customer_matches m
where not exists (select 1 from public.opportunities o where o.id = m.opportunity_id and o.b2b_eligible and o.customer_visible);

create or replace function private.graph_opportunity_visible(p_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.opportunities o
    join public.opportunity_customer_matches m on m.opportunity_id = o.id
    where o.id = p_opportunity_id
      and o.b2b_eligible
      and o.customer_visible
      and public.is_company_member(m.company_id)
  );
$$;

alter table public.intelligence_ingestion_runs enable row level security;
alter table public.source_record_links enable row level security;
alter table public.b2b_source_eligibility_rules enable row level security;
alter table public.intelligence_signal_rules enable row level security;
alter table public.business_entity_identifiers enable row level security;
alter table public.business_entity_profiles enable row level security;
alter table public.business_entity_financials enable row level security;
alter table public.business_domains enable row level security;
alter table public.business_properties enable row level security;
alter table public.business_entity_properties enable row level security;
alter table public.customer_profile_terms enable row level security;

revoke all on table public.intelligence_ingestion_runs, public.source_record_links, public.b2b_source_eligibility_rules, public.intelligence_signal_rules, public.business_entity_identifiers, public.business_entity_profiles, public.business_entity_financials, public.business_domains, public.business_properties, public.business_entity_properties from anon, authenticated;
grant all on table public.intelligence_ingestion_runs, public.source_record_links, public.b2b_source_eligibility_rules, public.intelligence_signal_rules, public.business_entity_identifiers, public.business_entity_profiles, public.business_entity_financials, public.business_domains, public.business_properties, public.business_entity_properties to service_role;

drop policy if exists b2b_ingestion_runs_admin_read on public.intelligence_ingestion_runs;
create policy b2b_ingestion_runs_admin_read on public.intelligence_ingestion_runs for select to authenticated using ((select public.is_platform_admin()));
drop policy if exists b2b_source_links_admin_read on public.source_record_links;
create policy b2b_source_links_admin_read on public.source_record_links for select to authenticated using ((select public.is_platform_admin()));
drop policy if exists b2b_source_rules_admin_read on public.b2b_source_eligibility_rules;
create policy b2b_source_rules_admin_read on public.b2b_source_eligibility_rules for select to authenticated using ((select public.is_platform_admin()));
drop policy if exists b2b_signal_rules_admin_read on public.intelligence_signal_rules;
create policy b2b_signal_rules_admin_read on public.intelligence_signal_rules for select to authenticated using ((select public.is_platform_admin()));

grant select on table public.customer_profile_terms to authenticated;
drop policy if exists customer_profile_terms_member_read on public.customer_profile_terms;
create policy customer_profile_terms_member_read on public.customer_profile_terms for select to authenticated using ((select public.is_company_member(company_id)));
drop policy if exists customer_profile_terms_admin_write on public.customer_profile_terms;
create policy customer_profile_terms_admin_write on public.customer_profile_terms for all to authenticated using ((select public.is_company_admin(company_id))) with check ((select public.is_company_admin(company_id)));

create index if not exists graph_entities_b2b_idx on public.business_entities(b2b_eligible, b2b_status, updated_at desc);
create index if not exists graph_events_customer_eligible_idx on public.events(customer_eligible, event_type, occurred_at desc);
create index if not exists graph_signals_customer_eligible_idx on public.signals(customer_eligible, signal_family, last_confirmed_at desc);
create index if not exists graph_opportunities_customer_visible_idx on public.opportunities(customer_visible, b2b_eligible, status, score desc);
create index if not exists graph_opportunity_matches_feed_idx on public.opportunity_customer_matches(company_id, status, matched_at desc);

-- Public landing preview: it uses the unified B2B feed and a free-text profile,
-- not a customer-selected vertical or legacy territory product.
create or replace function public.browse_b2b_preview_feed(
  p_postcode_district text,
  p_profile jsonb default '{}'::jsonb,
  p_limit integer default 100
)
returns table (
  source_kind text,
  source_record_id uuid,
  headline text,
  stage text,
  estimated_project_value_high numeric,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  published_at timestamptz,
  deadline_at timestamptz,
  buyer_name text,
  summary text,
  recommended_action text,
  access_level text,
  source_url text,
  score numeric,
  opportunity_bucket text,
  profile_match numeric
)
language sql
stable
set search_path = public
as $$
  with candidates as (
    select
      'planning'::text as source_kind,
      ato.id as source_record_id,
      coalesce(nullif(ac.project_type, ''), 'Commercial business change')::text as headline,
      pa.status::text as stage,
      coalesce(ac.estimated_total_project_value_high, 0)::numeric as estimated_project_value_high,
      coalesce(ato.estimated_trade_value_low, 0)::numeric as estimated_trade_value_low,
      coalesce(ato.estimated_trade_value_high, 0)::numeric as estimated_trade_value_high,
      coalesce(pa.received_date::timestamptz, pa.created_at) as published_at,
      pa.decision_due_date::timestamptz as deadline_at,
      null::text as buyer_name,
      'Commercial evidence suggests this organisation or premises is entering a buying window.'::text as summary,
      'Review the teaser in the marketplace and decide whether to unlock the full lead.'::text as recommended_action,
      'teaser'::text as access_level,
      null::text as source_url,
      coalesce(ato.opportunity_score, 0)::numeric as score,
      coalesce(ato.opportunity_bucket::text, 'possible') as opportunity_bucket,
      case when exists (
        select 1
        from jsonb_array_elements_text(coalesce(p_profile -> 'keywords', '[]'::jsonb)) keyword
        where lower(concat_ws(' ', ac.project_type, ac.summary, pa.proposal_description)) like '%' || lower(split_part(keyword, ' ', 1)) || '%'
      ) then 1 else 0 end::numeric as profile_match
    from public.application_trade_opportunities ato
    join public.planning_applications pa on pa.id = ato.planning_application_id
    join public.application_classifications ac on ac.id = ato.application_classification_id
    where ato.is_active
      and pa.is_commercial is true
      and upper(trim(coalesce(pa.postcode_district, ato.postcode_district))) = upper(trim(p_postcode_district))
  )
  select source_kind, source_record_id, headline, stage, estimated_project_value_high,
    estimated_trade_value_low, estimated_trade_value_high, published_at, deadline_at,
    buyer_name, summary, recommended_action, access_level, source_url, score,
    opportunity_bucket, profile_match
  from candidates
  order by profile_match desc, score desc nulls last, published_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 100), 100));
$$;

revoke all on function public.browse_b2b_preview_feed(text, jsonb, integer) from public;
grant execute on function public.browse_b2b_preview_feed(text, jsonb, integer) to anon, authenticated, service_role;
