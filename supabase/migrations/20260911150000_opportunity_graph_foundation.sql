-- Phase 1: market-agnostic Opportunity Graph foundation.
--
-- This migration is additive. It preserves the existing MyTradeBox-derived
-- planning/trade tables and creates a canonical graph beside them. The bridge
-- functions below turn real planning records and their existing deterministic
-- trade matches into graph entities, events, signals, scored opportunities and
-- customer matches. No fixture rows are created by this migration.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table if not exists public.opportunity_markets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  source_trade_category_id uuid references public.trade_categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_trade_category_id)
);

create table if not exists public.need_categories (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.opportunity_markets(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, slug)
);

create table if not exists public.supplier_need_mappings (
  id uuid primary key default gen_random_uuid(),
  supplier_category_id uuid not null references public.supplier_categories(id) on delete cascade,
  need_category_id uuid not null references public.need_categories(id) on delete cascade,
  match_weight numeric(6,5) not null default 1 check (match_weight >= 0 and match_weight <= 1),
  match_method text not null default 'rules',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (supplier_category_id, need_category_id)
);

create table if not exists public.provider_config (
  provider_key text primary key,
  display_name text not null,
  adapter_key text not null,
  enabled boolean not null default false,
  essential boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_data_rights (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.provider_config(provider_key) on delete cascade,
  field_key text not null default '*',
  internal_use_only boolean not null default true,
  customer_display_allowed boolean not null default false,
  customer_export_allowed boolean not null default false,
  crm_export_allowed boolean not null default false,
  cache_allowed boolean not null default false,
  retention_period_days integer check (retention_period_days is null or retention_period_days >= 0),
  attribution_required boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (provider_key, field_key)
);

create table if not exists public.provider_usage (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.provider_config(provider_key) on delete restrict,
  operation text not null,
  requested_at timestamptz not null default now(),
  succeeded boolean not null default false,
  units integer not null default 1 check (units >= 0),
  estimated_cost numeric,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.source_records (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  record_type text not null,
  external_id text not null,
  source_url text,
  source_published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  content_hash text,
  payload jsonb not null default '{}'::jsonb,
  rights_snapshot jsonb not null default '[]'::jsonb,
  is_fixture boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (provider_key, record_type, external_id)
);

create index if not exists graph_source_records_provider_idx
  on public.source_records(provider_key, record_type, last_seen_at desc);

create table if not exists public.business_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null default 'business' check (entity_type in ('business', 'organisation', 'person')),
  canonical_name text not null,
  legal_name text,
  companies_house_number text,
  registration_jurisdiction text default 'GB',
  website text,
  domain text,
  telephone text,
  resolution_status text not null default 'unresolved' check (resolution_status in ('resolved', 'probable', 'unresolved', 'review')),
  resolution_method text,
  resolution_confidence numeric(4,3) check (resolution_confidence is null or resolution_confidence between 0 and 1),
  resolution_evidence jsonb not null default '{}'::jsonb,
  origin_source_record_id uuid unique references public.source_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists graph_business_entities_ch_number_idx
  on public.business_entities(companies_house_number)
  where companies_house_number is not null;

create table if not exists public.business_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id) on delete cascade,
  alias text not null,
  alias_type text not null default 'source_name',
  source_record_id uuid references public.source_records(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_id, alias, alias_type)
);

create table if not exists public.business_locations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.business_entities(id) on delete set null,
  address_text text,
  full_postcode text,
  postcode_district text,
  postcode_area text,
  town_city text,
  local_authority text,
  county text,
  region text,
  uprn text,
  latitude double precision,
  longitude double precision,
  location geography(Point, 4326),
  resolution_status text not null default 'unresolved' check (resolution_status in ('resolved', 'probable', 'unresolved', 'review')),
  resolution_method text,
  resolution_confidence numeric(4,3) check (resolution_confidence is null or resolution_confidence between 0 and 1),
  resolution_evidence jsonb not null default '{}'::jsonb,
  origin_source_record_id uuid unique references public.source_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists graph_business_locations_postcode_idx
  on public.business_locations(postcode_district);
create index if not exists graph_business_locations_uprn_idx
  on public.business_locations(uprn)
  where uprn is not null;
create index if not exists graph_business_locations_location_idx
  on public.business_locations using gist(location);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  given_name text,
  family_name text,
  full_name text not null,
  job_title text,
  profile_url text,
  resolution_status text not null default 'unresolved' check (resolution_status in ('resolved', 'probable', 'unresolved', 'review')),
  resolution_confidence numeric(4,3) check (resolution_confidence is null or resolution_confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_people (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  relationship text,
  is_decision_maker boolean not null default false,
  source_record_id uuid references public.source_records(id) on delete set null,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique (entity_id, person_id)
);

create table if not exists public.contact_points (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete cascade,
  entity_id uuid references public.business_entities(id) on delete cascade,
  contact_type text not null check (contact_type in ('email', 'telephone', 'mobile', 'website', 'profile')),
  value text not null,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'probable', 'verified', 'suppressed')),
  provider_key text,
  source_record_id uuid references public.source_records(id) on delete set null,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  display_allowed boolean not null default false,
  export_allowed boolean not null default false,
  retrieved_at timestamptz not null default now(),
  last_verified_at timestamptz,
  check (num_nonnulls(person_id, entity_id) = 1)
);

create unique index if not exists graph_contact_points_value_idx
  on public.contact_points(contact_type, value, (coalesce(person_id, entity_id)));

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id) on delete cascade,
  location_id uuid references public.business_locations(id) on delete set null,
  source_record_id uuid not null references public.source_records(id) on delete cascade,
  event_type text not null,
  dedupe_key text not null unique,
  occurred_at timestamptz not null,
  observed_at timestamptz not null default now(),
  is_factual boolean not null default true,
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  factual_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists graph_events_entity_idx on public.events(entity_id, occurred_at desc);
create index if not exists graph_events_type_idx on public.events(event_type, occurred_at desc);
create index if not exists graph_events_source_idx on public.events(source_record_id);

create table if not exists public.event_evidence (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source_record_id uuid not null references public.source_records(id) on delete cascade,
  evidence_type text not null default 'source_record',
  source_url text,
  excerpt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (event_id, source_record_id, evidence_type)
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id) on delete cascade,
  location_id uuid references public.business_locations(id) on delete set null,
  signal_type text not null,
  dedupe_key text not null unique,
  status text not null default 'active' check (status in ('active', 'stale', 'superseded', 'rejected')),
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  first_detected_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  buying_window_start timestamptz,
  buying_window_end timestamptz,
  interpretation jsonb not null default '{}'::jsonb,
  generation_method text not null default 'rules',
  generation_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists graph_signals_entity_idx on public.signals(entity_id, last_confirmed_at desc);
create index if not exists graph_signals_type_idx on public.signals(signal_type, status, last_confirmed_at desc);

create table if not exists public.signal_evidence (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.signals(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  rationale text,
  created_at timestamptz not null default now(),
  unique (signal_id, event_id)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  legacy_application_trade_opportunity_id uuid unique references public.application_trade_opportunities(id) on delete set null,
  entity_id uuid not null references public.business_entities(id) on delete cascade,
  location_id uuid references public.business_locations(id) on delete set null,
  market_id uuid not null references public.opportunity_markets(id) on delete restrict,
  supplier_category_id uuid not null references public.supplier_categories(id) on delete restrict,
  title text not null,
  status text not null default 'open' check (status in ('open', 'paused', 'won', 'lost', 'expired')),
  score numeric(5,2) check (score is null or score between 0 and 100),
  temperature text check (temperature is null or temperature in ('hot', 'warm', 'early')),
  buying_window_start timestamptz,
  buying_window_end timestamptz,
  why_now text,
  likely_requirements jsonb not null default '{}'::jsonb,
  source_attribution jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  last_scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists graph_opportunities_market_idx
  on public.opportunities(market_id, status, score desc);
create index if not exists graph_opportunities_entity_idx
  on public.opportunities(entity_id, detected_at desc);
create index if not exists graph_opportunities_location_idx
  on public.opportunities(location_id, detected_at desc);

create table if not exists public.opportunity_signals (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  signal_id uuid not null references public.signals(id) on delete cascade,
  relationship text not null default 'supports',
  created_at timestamptz not null default now(),
  primary key (opportunity_id, signal_id)
);

create table if not exists public.opportunity_needs (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  need_category_id uuid not null references public.need_categories(id) on delete restrict,
  relevance numeric(4,3) not null default 1 check (relevance between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (opportunity_id, need_category_id)
);

create table if not exists public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references public.opportunity_markets(id) on delete cascade,
  formula_version text not null,
  factor_key text not null,
  weight numeric(7,6) not null check (weight >= 0 and weight <= 1),
  min_value numeric not null default 0,
  max_value numeric not null default 100 check (max_value > min_value),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (market_id, formula_version, factor_key)
);

create unique index if not exists graph_scoring_rules_global_idx
  on public.scoring_rules(formula_version, factor_key)
  where market_id is null;

create table if not exists public.opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  score numeric(5,2) not null check (score between 0 and 100),
  temperature text not null check (temperature in ('hot', 'warm', 'early')),
  formula_version text not null,
  inputs jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (opportunity_id, formula_version)
);

create table if not exists public.opportunity_score_factors (
  id uuid primary key default gen_random_uuid(),
  opportunity_score_id uuid not null references public.opportunity_scores(id) on delete cascade,
  factor_key text not null,
  raw_value numeric not null,
  weight numeric not null,
  contribution numeric not null,
  created_at timestamptz not null default now(),
  unique (opportunity_score_id, factor_key)
);

create table if not exists public.customer_geographies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  geography_type text not null check (geography_type in ('town_city', 'radius', 'postcode', 'county', 'region', 'uk_wide')),
  label text not null,
  criteria jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists graph_customer_geographies_company_idx
  on public.customer_geographies(company_id, is_active);

create table if not exists public.customer_markets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  market_id uuid not null references public.opportunity_markets(id) on delete restrict,
  geography_id uuid references public.customer_geographies(id) on delete set null,
  supplier_category_id uuid references public.supplier_categories(id) on delete set null,
  status text not null default 'active' check (status in ('trial', 'active', 'paused', 'cancelled')),
  exclusive boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, market_id, geography_id, supplier_category_id)
);

create index if not exists graph_customer_markets_company_idx
  on public.customer_markets(company_id, status);

create table if not exists public.customer_preferences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  market_id uuid references public.opportunity_markets(id) on delete cascade,
  minimum_score numeric(5,2) check (minimum_score is null or minimum_score between 0 and 100),
  temperatures text[] not null default array['hot','warm','early']::text[],
  require_verified_contact boolean not null default false,
  alert_channels text[] not null default array['in_app']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, market_id)
);

create table if not exists public.opportunity_customer_matches (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  legacy_lead_match_id uuid unique references public.lead_matches(id) on delete set null,
  match_score numeric(5,2) check (match_score is null or match_score between 0 and 100),
  match_reasons jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'saved', 'dismissed', 'contacted', 'won', 'lost')),
  matched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (opportunity_id, company_id)
);

create index if not exists graph_opportunity_matches_company_idx
  on public.opportunity_customer_matches(company_id, status, matched_at desc);

create table if not exists public.opportunity_contacts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  contact_point_id uuid references public.contact_points(id) on delete set null,
  reason text,
  priority integer not null default 0,
  unlocked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (opportunity_id, person_id, contact_point_id)
);

create table if not exists public.contact_enrichment_requests (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  provider_key text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'suppressed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  estimated_cost numeric,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.contact_enrichment_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.contact_enrichment_requests(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  provider_key text not null,
  source_record_id uuid references public.source_records(id) on delete set null,
  result jsonb not null default '{}'::jsonb,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  rights_snapshot jsonb not null default '[]'::jsonb,
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.opportunity_feedback (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  outcome text not null check (outcome in ('pursuing', 'won', 'lost', 'not_relevant', 'already_has_supplier', 'wrong_contact', 'too_early', 'too_late', 'false_signal')),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists graph_feedback_opportunity_idx
  on public.opportunity_feedback(opportunity_id, created_at desc);

alter table public.planning_applications
  add column if not exists graph_source_record_id uuid references public.source_records(id) on delete set null;
create index if not exists graph_planning_source_record_idx
  on public.planning_applications(graph_source_record_id)
  where graph_source_record_id is not null;

-- Reference data is deliberately configuration, not application code. The
-- optional provider rows remain disabled until credentials and licensing are
-- explicitly configured.
insert into public.opportunity_markets (slug, name, description, display_order)
values
  ('hospitality_openings', 'Hospitality openings', 'Restaurants, cafes, pubs, takeaways, hotels and hospitality premises entering a buying window.', 10),
  ('moves_fitouts', 'Moves and fit-outs', 'Commercial, office, retail and industrial businesses moving, refurbishing or expanding.', 20),
  ('care_health', 'Care and health', 'New or changing care homes, clinics, dentists and healthcare providers.', 30),
  ('commercial_energy', 'Commercial energy', 'Commercial properties showing credible retrofit or efficiency opportunities.', 40),
  ('growing_businesses', 'Growing businesses', 'Businesses showing corroborated growth, hiring, funding, premises or technology change.', 50),
  ('public_contracts', 'Public contracts', 'Public tenders, awards, pipeline opportunities and upcoming contract expiry signals.', 60)
on conflict (slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order, updated_at = now();

insert into public.need_categories (market_id, slug, name, description, is_default)
select m.id, v.slug, v.name, v.description, v.is_default
from public.opportunity_markets m
join (values
  ('hospitality_openings','hospitality_operations','Hospitality operations','Hospitality operations and opening infrastructure',true),
  ('hospitality_openings','fit_out_and_technology','Fit-out and technology','Hospitality fit-out, technology and premises services',false),
  ('moves_fitouts','commercial_fit_out','Commercial fit-out','Commercial fit-out and workplace delivery',true),
  ('moves_fitouts','workplace_technology','Workplace technology','IT, connectivity, AV, security and workplace technology',false),
  ('care_health','care_operations','Care operations','Care and health operations, staffing and compliance',true),
  ('commercial_energy','energy_efficiency','Energy efficiency','Energy efficiency, retrofit and low-carbon infrastructure',true),
  ('growing_businesses','growth_enablement','Growth enablement','Services required to support business growth and change',true),
  ('public_contracts','contract_delivery','Contract delivery','Services relevant to delivering a public contract',true)
) as v(market_slug,slug,name,description,is_default) on v.market_slug = m.slug
on conflict (market_id, slug) do update set name = excluded.name, description = excluded.description, is_default = excluded.is_default, updated_at = now();

insert into public.provider_config (provider_key, display_name, adapter_key, enabled, essential)
values
  ('companies_house', 'Companies House', 'companies-house', false, true),
  ('fsa_fhrs', 'Food Standards Agency FHRS', 'fsa-fhrs', false, false),
  ('cqc', 'Care Quality Commission', 'cqc', false, false),
  ('nhs_ods', 'NHS Organisation Data Service', 'nhs-ods', false, false),
  ('epc', 'Government EPC data', 'epc', false, false),
  ('planning_data', 'Planning Data API', 'planning-data', false, true),
  ('plota', 'Plota', 'plota', true, true),
  ('find_a_tender', 'Find a Tender', 'find-a-tender', true, true),
  ('contracts_finder', 'Contracts Finder', 'contracts-finder', true, true),
  ('mock', 'Fixture provider', 'mock', false, false),
  ('ideal_postcodes', 'Ideal Postcodes', 'ideal-postcodes', false, false),
  ('people_data_labs', 'People Data Labs', 'people-data-labs', false, false),
  ('hunter', 'Hunter', 'hunter', false, false),
  ('apollo', 'Apollo', 'apollo', false, false),
  ('cognism', 'Cognism', 'cognism', false, false),
  ('google_places', 'Google Places', 'google-places', false, false),
  ('wappalyzer', 'Wappalyzer', 'wappalyzer', false, false),
  ('adzuna', 'Adzuna', 'adzuna', false, false),
  ('coresignal', 'Coresignal', 'coresignal', false, false),
  ('datagardener', 'DataGardener', 'datagardener', false, false),
  ('fullcircl', 'FullCircl', 'fullcircl', false, false),
  ('creditsafe', 'Creditsafe', 'creditsafe', false, false),
  ('beauhurst', 'Beauhurst', 'beauhurst', false, false),
  ('dealroom', 'Dealroom', 'dealroom', false, false),
  ('nimbus', 'Nimbus', 'nimbus', false, false)
on conflict (provider_key) do update set display_name = excluded.display_name, adapter_key = excluded.adapter_key, essential = excluded.essential, updated_at = now();

-- Rights start conservatively. A provider is not customer-displayable merely
-- because an API is reachable; each provider/field must be reviewed against
-- its current terms before enabling display, export or CRM delivery.
insert into public.provider_data_rights (
  provider_key, field_key, internal_use_only, customer_display_allowed,
  customer_export_allowed, crm_export_allowed, cache_allowed,
  retention_period_days, attribution_required, notes
)
select p.provider_key, '*', true, false, false, false, false, null, true,
       'Licensing review required before customer display, export or CRM delivery.'
from public.provider_config p
where p.provider_key <> 'mock'
on conflict (provider_key, field_key) do nothing;

insert into public.provider_data_rights (
  provider_key, field_key, internal_use_only, customer_display_allowed,
  customer_export_allowed, crm_export_allowed, cache_allowed,
  retention_period_days, attribution_required, notes
)
values ('mock', '*', false, true, false, false, true, null, false, 'Synthetic fixture data only; never represent as production data.')
on conflict (provider_key, field_key) do nothing;

-- The initial deterministic score is configurable in rows, not embedded in
-- an LLM prompt. Market-specific rules can be added later and take precedence
-- over these global defaults.
insert into public.scoring_rules (market_id, formula_version, factor_key, weight)
values
  (null, 'v1', 'event_strength', 0.20),
  (null, 'v1', 'source_authority', 0.10),
  (null, 'v1', 'recency', 0.15),
  (null, 'v1', 'corroboration', 0.10),
  (null, 'v1', 'need_fit', 0.20),
  (null, 'v1', 'geography_fit', 0.10),
  (null, 'v1', 'contact_availability', 0.05),
  (null, 'v1', 'data_completeness', 0.05),
  (null, 'v1', 'buying_window', 0.05)
on conflict (market_id, formula_version, factor_key) do update set weight = excluded.weight, is_active = true;

create or replace function public.score_opportunity_factors(
  p_market_id uuid,
  p_factors jsonb,
  p_formula_version text default 'v1'
)
returns table (score numeric, temperature text, formula_version text)
language plpgsql
stable
set search_path = public
as $$
declare
  v_score numeric := 0;
begin
  with candidates as (
    select r.*
    from public.scoring_rules r
    where r.formula_version = p_formula_version
      and r.is_active
      and (r.market_id is null or r.market_id = p_market_id)
  ), selected as (
    select distinct on (factor_key)
      factor_key, weight, min_value, max_value
    from candidates
    order by factor_key, (market_id = p_market_id) desc nulls last, id
  )
  select least(100::numeric, greatest(0::numeric, coalesce(sum(
    least(s.max_value, greatest(s.min_value, coalesce((p_factors ->> s.factor_key)::numeric, 0))) * s.weight
  ), 0)))
  into v_score
  from selected s;

  return query
  select round(v_score, 2),
    case when v_score >= 75 then 'hot' when v_score >= 50 then 'warm' else 'early' end,
    p_formula_version;
end;
$$;

revoke all on function public.score_opportunity_factors(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.score_opportunity_factors(uuid, jsonb, text) to service_role;

-- The graph is read through matched opportunities. Keep the membership check
-- in a non-exposed schema so it cannot become an accidental public RPC.
create or replace function private.graph_opportunity_visible(p_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.opportunity_customer_matches m
    where m.opportunity_id = p_opportunity_id
      and public.is_company_member(m.company_id)
  );
$$;

grant execute on function private.graph_opportunity_visible(uuid) to authenticated, service_role;

-- Bridge a planning source record into the canonical graph. Resolution is
-- deterministic where a Companies House number is present; otherwise the
-- source record gets its own unresolved business entity and is not silently
-- merged with another business.
create or replace function public.sync_planning_application_to_graph(p_planning_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pa public.planning_applications%rowtype;
  v_source_id uuid;
  v_entity_id uuid;
  v_location_id uuid;
  v_event_id uuid;
  v_signal_id uuid;
  v_rights jsonb;
  v_company_number text;
  v_entity_name text;
  v_event_type text;
  v_occurred_at timestamptz;
  v_event_key text;
  v_signal_type text;
  v_signal_key text;
begin
  select * into v_pa from public.planning_applications where id = p_planning_application_id;
  if not found then return null; end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.field_key), '[]'::jsonb)
  into v_rights
  from public.provider_data_rights r
  where r.provider_key = v_pa.provider;

  insert into public.source_records (
    provider_key, record_type, external_id, source_url, source_published_at,
    content_hash, payload, rights_snapshot, is_fixture, last_seen_at
  ) values (
    v_pa.provider, 'planning_application', v_pa.provider_application_id,
    v_pa.source_url, coalesce(v_pa.received_date::timestamptz, v_pa.created_at),
    v_pa.content_hash, coalesce(v_pa.raw_provider_payload, '{}'::jsonb), v_rights,
    v_pa.provider = 'mock' or coalesce(v_pa.raw_provider_payload ->> 'is_demo_data', 'false') = 'true', now()
  )
  on conflict (provider_key, record_type, external_id) do update set
    source_url = excluded.source_url,
    source_published_at = excluded.source_published_at,
    content_hash = excluded.content_hash,
    payload = excluded.payload,
    rights_snapshot = excluded.rights_snapshot,
    is_fixture = excluded.is_fixture,
    retrieved_at = now(),
    last_seen_at = now()
  returning id into v_source_id;

  v_company_number := nullif(coalesce(
    v_pa.raw_provider_payload ->> 'companies_house_number',
    v_pa.raw_provider_payload ->> 'company_number',
    v_pa.raw_provider_payload ->> 'companyNumber'
  ), '');
  v_entity_name := coalesce(nullif(btrim(v_pa.applicant_name), ''), nullif(btrim(v_pa.agent_company), ''), 'Unresolved planning applicant ' || v_pa.provider_application_id);

  select be.id into v_entity_id
  from public.business_entities be
  where origin_source_record_id = v_source_id
  limit 1;

  if v_entity_id is null and v_company_number is not null then
    select id into v_entity_id
    from public.business_entities
    where companies_house_number = v_company_number
    limit 1;
  end if;

  if v_entity_id is null then
    insert into public.business_entities (
      canonical_name, legal_name, companies_house_number, website, domain,
      resolution_status, resolution_method, resolution_confidence,
      resolution_evidence, origin_source_record_id
    ) values (
      v_entity_name,
      nullif(v_pa.raw_provider_payload ->> 'legal_name', ''),
      v_company_number,
      nullif(v_pa.raw_provider_payload ->> 'website', ''),
      nullif(v_pa.raw_provider_payload ->> 'domain', ''),
      case when v_company_number is null then 'unresolved' else 'resolved' end,
      case when v_company_number is null then 'source_record_only' else 'companies_house_number' end,
      case when v_company_number is null then 0.25 else 1 end,
      jsonb_build_object('source_record_id', v_source_id, 'deterministic_identifier', v_company_number),
      v_source_id
    ) returning id into v_entity_id;
  else
    update public.business_entities set
      canonical_name = coalesce(nullif(v_entity_name, ''), canonical_name),
      legal_name = coalesce(nullif(v_pa.raw_provider_payload ->> 'legal_name', ''), legal_name),
      website = coalesce(nullif(v_pa.raw_provider_payload ->> 'website', ''), website),
      domain = coalesce(nullif(v_pa.raw_provider_payload ->> 'domain', ''), domain),
      companies_house_number = coalesce(companies_house_number, v_company_number),
      resolution_status = case when v_company_number is not null then 'resolved' else resolution_status end,
      resolution_method = case when v_company_number is not null then 'companies_house_number' else resolution_method end,
      resolution_confidence = case when v_company_number is not null then 1 else resolution_confidence end
    where id = v_entity_id;
  end if;

  insert into public.business_entity_aliases (entity_id, alias, alias_type, source_record_id)
  select v_entity_id, btrim(value), kind, v_source_id
  from (values
    (v_pa.applicant_name, 'applicant_name'),
    (v_pa.agent_company, 'agent_company')
  ) as aliases(value, kind)
  where value is not null and btrim(value) <> ''
  on conflict (entity_id, alias, alias_type) do nothing;

  insert into public.business_locations (
    entity_id, address_text, full_postcode, postcode_district,
    latitude, longitude, location, resolution_status, resolution_method,
    resolution_confidence, resolution_evidence, origin_source_record_id
  ) values (
    v_entity_id, v_pa.address_text, upper(nullif(btrim(v_pa.postcode), '')),
    v_pa.postcode_district, v_pa.latitude, v_pa.longitude,
    case when v_pa.latitude is not null and v_pa.longitude is not null
      then st_setsrid(st_makepoint(v_pa.longitude, v_pa.latitude), 4326)::geography end,
    case when v_pa.postcode is not null then 'probable' else 'unresolved' end,
    case when v_pa.postcode is not null then 'postcode' else 'source_record_only' end,
    case when v_pa.postcode is not null then 0.8 else 0.25 end,
    jsonb_build_object('source_record_id', v_source_id), v_source_id
  )
  on conflict (origin_source_record_id) do update set
    entity_id = excluded.entity_id,
    address_text = excluded.address_text,
    full_postcode = excluded.full_postcode,
    postcode_district = excluded.postcode_district,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    location = excluded.location,
    updated_at = now()
  returning id into v_location_id;

  v_event_type := case v_pa.status
    when 'approved' then 'planning_approved'
    when 'rejected' then 'planning_rejected'
    when 'withdrawn' then 'planning_withdrawn'
    else 'planning_activity'
  end;
  v_occurred_at := coalesce(v_pa.decision_date::timestamptz, v_pa.validated_date::timestamptz, v_pa.received_date::timestamptz, v_pa.created_at);
  v_event_key := v_source_id::text || ':' || v_event_type || ':' || to_char(v_occurred_at at time zone 'UTC', 'YYYY-MM-DD');

  insert into public.events (
    entity_id, location_id, source_record_id, event_type, dedupe_key,
    occurred_at, factual_data
  ) values (
    v_entity_id, v_location_id, v_source_id, v_event_type, v_event_key,
    v_occurred_at,
    jsonb_build_object(
      'provider', v_pa.provider,
      'provider_application_id', v_pa.provider_application_id,
      'planning_reference', v_pa.planning_reference,
      'status', v_pa.status,
      'status_raw', v_pa.status_raw,
      'application_type', v_pa.application_type,
      'proposal_description', v_pa.proposal_description,
      'received_date', v_pa.received_date,
      'decision_date', v_pa.decision_date,
      'is_commercial', v_pa.is_commercial
    )
  )
  on conflict (dedupe_key) do update set
    entity_id = excluded.entity_id,
    location_id = excluded.location_id,
    occurred_at = excluded.occurred_at,
    factual_data = excluded.factual_data
  returning id into v_event_id;

  insert into public.event_evidence (event_id, source_record_id, source_url, metadata)
  values (v_event_id, v_source_id, v_pa.source_url, jsonb_build_object('provider', v_pa.provider, 'planning_reference', v_pa.planning_reference))
  on conflict (event_id, source_record_id, evidence_type) do update set source_url = excluded.source_url, metadata = excluded.metadata;

  v_signal_type := case when coalesce(v_pa.is_commercial, false) then 'commercial_planning_activity' else 'planning_activity' end;
  v_signal_key := v_source_id::text || ':' || v_signal_type;
  insert into public.signals (
    entity_id, location_id, signal_type, dedupe_key, confidence,
    first_detected_at, last_confirmed_at, interpretation, generation_method, generation_version
  ) values (
    v_entity_id, v_location_id, v_signal_type, v_signal_key, 0.75,
    coalesce(v_pa.first_seen_at, now()), now(),
    jsonb_build_object('factual_event_id', v_event_id, 'classification_pending', true, 'provider', v_pa.provider),
    'rules', 'v1'
  )
  on conflict (dedupe_key) do update set
    entity_id = excluded.entity_id,
    location_id = excluded.location_id,
    last_confirmed_at = now(),
    interpretation = excluded.interpretation
  returning id into v_signal_id;

  insert into public.signal_evidence (signal_id, event_id, rationale)
  values (v_signal_id, v_event_id, 'Signal is supported by a factual planning event from the source record.')
  on conflict (signal_id, event_id) do nothing;

  update public.planning_applications
  set graph_source_record_id = v_source_id
  where id = v_pa.id and graph_source_record_id is distinct from v_source_id;

  return v_source_id;
end;
$$;

revoke all on function public.sync_planning_application_to_graph(uuid) from public, anon, authenticated;
grant execute on function public.sync_planning_application_to_graph(uuid) to service_role;

create or replace function public.sync_application_trade_opportunity_to_graph(p_legacy_opportunity_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_legacy public.application_trade_opportunities%rowtype;
  v_pa public.planning_applications%rowtype;
  v_ac public.application_classifications%rowtype;
  v_trade public.trade_categories%rowtype;
  v_source_id uuid;
  v_signal_id uuid;
  v_graph_id uuid;
  v_market_id uuid;
  v_supplier_id uuid;
  v_need_id uuid;
  v_score_id uuid;
  v_factors jsonb;
  v_scored record;
  v_event_strength numeric;
  v_recency numeric;
  v_completeness numeric;
  v_buying_window numeric;
begin
  select * into v_legacy from public.application_trade_opportunities where id = p_legacy_opportunity_id;
  if not found then return null; end if;
  select * into v_pa from public.planning_applications where id = v_legacy.planning_application_id;
  if not found then return null; end if;
  select * into v_ac from public.application_classifications where id = v_legacy.application_classification_id;
  select * into v_trade from public.trade_categories where id = v_legacy.trade_category_id;
  if v_trade.id is null then return null; end if;

  v_source_id := public.sync_planning_application_to_graph(v_pa.id);

  select s.id into v_signal_id
  from public.signals s
  where s.dedupe_key = v_source_id::text || ':' || case when coalesce(v_pa.is_commercial, false) then 'commercial_planning_activity' else 'planning_activity' end
  limit 1;

  -- Only commercial or hospitality-like planning records become commercial
  -- opportunities. Residential planning remains a factual graph event and is
  -- not promoted into a business opportunity.
  select m.id into v_market_id
  from public.opportunity_markets m
  where m.slug = case
    when lower(coalesce(v_ac.project_type, '') || ' ' || coalesce(v_pa.proposal_description, '')) ~ '(restaurant|cafe|coffee|pub|bar|takeaway|hotel|hospitality)' then 'hospitality_openings'
    when coalesce(v_pa.is_commercial, false) then 'moves_fitouts'
    else null
  end;
  if v_market_id is null then return null; end if;

  select sc.id into v_supplier_id from public.supplier_categories sc where source_trade_category_id = v_legacy.trade_category_id;
  if v_supplier_id is null then return null; end if;

  select snm.need_category_id into v_need_id
  from public.supplier_need_mappings snm
  join public.need_categories n on n.id = snm.need_category_id and n.market_id = v_market_id and n.is_active
  where snm.supplier_category_id = v_supplier_id and snm.is_active
  order by snm.match_weight desc
  limit 1;
  if v_need_id is null then
    select nc.id into v_need_id from public.need_categories nc where market_id = v_market_id and is_default and is_active limit 1;
  end if;
  if v_need_id is null then return null; end if;

  v_event_strength := case v_pa.status
    when 'approved' then 95 when 'decision_expected' then 85 when 'under_consideration' then 75
    when 'validated' then 65 when 'submitted' then 55 when 'appeal_lodged' then 60 else 35 end;
  v_recency := greatest(0, least(100, 100 - extract(epoch from (now() - coalesce(v_pa.decision_date::timestamptz, v_pa.received_date::timestamptz, v_pa.created_at))) / 86400 / 2));
  v_completeness := (case when v_pa.address_text is not null then 15 else 0 end)
    + (case when v_pa.postcode is not null then 15 else 0 end)
    + (case when v_pa.source_url is not null then 15 else 0 end)
    + (case when v_ac.summary is not null then 15 else 0 end)
    + (case when v_legacy.likely_scope is not null then 20 else 0 end)
    + (case when v_legacy.recommended_action is not null then 20 else 0 end);
  v_buying_window := case
    when lower(coalesce(v_ac.opportunity_timing, '')) ~ '(now|immediate|urgent)' then 100
    when lower(coalesce(v_ac.opportunity_timing, '')) ~ '(soon|near)' then 75
    when lower(coalesce(v_ac.opportunity_timing, '')) ~ '(later|future)' then 40
    else 55
  end;
  v_factors := jsonb_build_object(
    'event_strength', v_event_strength,
    'source_authority', case when v_pa.provider in ('plota', 'planning_data') then 75 when v_pa.provider = 'mock' then 10 else 50 end,
    'recency', v_recency,
    'corroboration', 20,
    'need_fit', coalesce(v_legacy.fit_score, 0),
    'geography_fit', 50,
    'contact_availability', case when v_pa.applicant_name is not null or v_pa.agent_company is not null then 80 else 0 end,
    'data_completeness', v_completeness,
    'buying_window', v_buying_window
  );
  select * into v_scored from public.score_opportunity_factors(v_market_id, v_factors, 'v1');

  insert into public.opportunities (
    legacy_application_trade_opportunity_id, entity_id, location_id, market_id,
    supplier_category_id, title, status, score, temperature,
    buying_window_start, buying_window_end, why_now, likely_requirements,
    source_attribution, detected_at, last_scored_at
  )
  select
    v_legacy.id, e.entity_id, e.location_id, v_market_id, v_supplier_id,
    coalesce(nullif(v_ac.project_type, ''), nullif(left(v_pa.proposal_description, 140), ''), v_trade.name || ' opportunity'),
    case when v_legacy.is_active then 'open' else 'expired' end,
    v_scored.score, v_scored.temperature,
    coalesce(v_pa.decision_due_date::timestamptz, v_pa.received_date::timestamptz),
    case when v_pa.decision_due_date is not null then v_pa.decision_due_date::timestamptz + interval '90 days' end,
    format('Planning application %s is %s and matches a %s requirement.', v_pa.planning_reference, v_pa.status, v_trade.name),
    jsonb_build_object('supplier_category', v_trade.name, 'likely_scope', coalesce(to_jsonb(v_legacy.likely_scope), '[]'::jsonb), 'match_reasons', coalesce(to_jsonb(v_legacy.match_reasons), '[]'::jsonb)),
    jsonb_build_object(
      'provider', v_pa.provider,
      'source_url', v_pa.source_url,
      'source_record_id', v_source_id,
      'is_fixture', coalesce((select is_fixture from public.source_records where id = v_source_id), false),
      'rights_snapshot', coalesce((select rights_snapshot from public.source_records where id = v_source_id), '[]'::jsonb)
    ),
    coalesce(v_pa.received_date::timestamptz, v_legacy.created_at), now()
  from (
    select e.entity_id, e.location_id
    from public.events e
    where e.source_record_id = v_source_id
    order by e.occurred_at desc
    limit 1
  ) e
  on conflict (legacy_application_trade_opportunity_id) do update set
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
    updated_at = now()
  returning id into v_graph_id;

  insert into public.opportunity_signals (opportunity_id, signal_id)
  values (v_graph_id, v_signal_id)
  on conflict do nothing;

  insert into public.opportunity_needs (opportunity_id, need_category_id, relevance, evidence)
  values (v_graph_id, v_need_id, 1, jsonb_build_object('match_method', 'legacy_trade_category_bridge', 'trade_category_id', v_trade.id))
  on conflict (opportunity_id, need_category_id) do update set relevance = excluded.relevance, evidence = excluded.evidence;

  insert into public.opportunity_scores (opportunity_id, score, temperature, formula_version, inputs)
  values (v_graph_id, v_scored.score, v_scored.temperature, v_scored.formula_version, v_factors)
  on conflict (opportunity_id, formula_version) do update set score = excluded.score, temperature = excluded.temperature, inputs = excluded.inputs, computed_at = now()
  returning id into v_score_id;

  delete from public.opportunity_score_factors where opportunity_score_id = v_score_id;
  insert into public.opportunity_score_factors (opportunity_score_id, factor_key, raw_value, weight, contribution)
  select v_score_id, r.factor_key, least(r.max_value, greatest(r.min_value, coalesce((v_factors ->> r.factor_key)::numeric, 0))), r.weight,
         least(r.max_value, greatest(r.min_value, coalesce((v_factors ->> r.factor_key)::numeric, 0))) * r.weight
  from public.scoring_rules r
  where r.formula_version = v_scored.formula_version and r.is_active and r.market_id is null;

  insert into public.opportunity_customer_matches (
    opportunity_id, company_id, legacy_lead_match_id, match_score,
    match_reasons, matched_at
  )
  select v_graph_id, lm.company_id, lm.id, v_legacy.fit_score,
         jsonb_build_object('method', 'legacy_territory_match', 'territory_claim_id', lm.territory_claim_id), lm.matched_at
  from public.lead_matches lm
  where lm.application_trade_opportunity_id = v_legacy.id
  on conflict (opportunity_id, company_id) do update set
    legacy_lead_match_id = excluded.legacy_lead_match_id,
    match_score = excluded.match_score,
    match_reasons = excluded.match_reasons;

  return v_graph_id;
end;
$$;

revoke all on function public.sync_application_trade_opportunity_to_graph(uuid) from public, anon, authenticated;
grant execute on function public.sync_application_trade_opportunity_to_graph(uuid) to service_role;

create or replace function public.sync_legacy_lead_match_to_graph(p_lead_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.lead_matches%rowtype;
  v_graph_id uuid;
  v_score numeric;
begin
  select * into v_match from public.lead_matches where id = p_lead_match_id;
  if not found then return; end if;
  select o.id, o.score into v_graph_id, v_score
  from public.opportunities o
  where legacy_application_trade_opportunity_id = v_match.application_trade_opportunity_id;
  if v_graph_id is null then return; end if;

  insert into public.opportunity_customer_matches (
    opportunity_id, company_id, legacy_lead_match_id, match_score,
    match_reasons, matched_at
  ) values (
    v_graph_id, v_match.company_id, v_match.id, v_score,
    jsonb_build_object('method', 'legacy_territory_match', 'territory_claim_id', v_match.territory_claim_id), v_match.matched_at
  )
  on conflict (opportunity_id, company_id) do update set
    legacy_lead_match_id = excluded.legacy_lead_match_id,
    match_score = excluded.match_score,
    match_reasons = excluded.match_reasons;
end;
$$;

revoke all on function public.sync_legacy_lead_match_to_graph(uuid) from public, anon, authenticated;
grant execute on function public.sync_legacy_lead_match_to_graph(uuid) to service_role;

create or replace function public.trg_graph_sync_planning_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_planning_application_to_graph(new.id);
  return new;
end;
$$;

create or replace function public.trg_graph_sync_application_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_application_trade_opportunity_to_graph(new.id);
  return new;
end;
$$;

create or replace function public.trg_graph_sync_lead_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_legacy_lead_match_to_graph(new.id);
  return new;
end;
$$;

revoke all on function public.trg_graph_sync_planning_application() from public, anon, authenticated;
revoke all on function public.trg_graph_sync_application_opportunity() from public, anon, authenticated;
revoke all on function public.trg_graph_sync_lead_match() from public, anon, authenticated;
grant execute on function public.trg_graph_sync_planning_application() to service_role;
grant execute on function public.trg_graph_sync_application_opportunity() to service_role;
grant execute on function public.trg_graph_sync_lead_match() to service_role;

create trigger zz_graph_sync_planning_application
after insert or update of provider, provider_application_id, status, status_raw,
  planning_reference, address_text, postcode, latitude, longitude, application_type,
  proposal_description, received_date, validated_date, decision_due_date,
  decision_date, applicant_name, agent_company, source_url, raw_provider_payload,
  content_hash
on public.planning_applications
for each row execute function public.trg_graph_sync_planning_application();

create trigger zz_graph_sync_application_opportunity
after insert or update of fit_score, match_reasons, likely_scope,
  estimated_trade_value_low, estimated_trade_value_high, recommended_action,
  recommended_contact_timing, ai_confidence, is_active, postcode_district
on public.application_trade_opportunities
for each row execute function public.trg_graph_sync_application_opportunity();

create trigger zz_graph_sync_lead_match
after insert or update on public.lead_matches
for each row execute function public.trg_graph_sync_lead_match();

-- Backfill the graph from the clone's existing real source rows. The provider
-- and fixture flags are preserved; no synthetic opportunities are introduced.
do $$
declare
  v_row record;
begin
  for v_row in select pa.id from public.planning_applications pa order by pa.created_at loop
    perform public.sync_planning_application_to_graph(v_row.id);
  end loop;
  for v_row in select ato.id from public.application_trade_opportunities ato order by ato.created_at loop
    perform public.sync_application_trade_opportunity_to_graph(v_row.id);
  end loop;
  for v_row in select lm.id from public.lead_matches lm order by lm.matched_at loop
    perform public.sync_legacy_lead_match_to_graph(v_row.id);
  end loop;
end;
$$;

-- Supplier categories mirror the existing trade catalogue during the bridge;
-- future markets can add categories without changing the legacy catalogue.
insert into public.supplier_categories (slug, name, description, source_trade_category_id)
select tc.slug, tc.name, tc.description, tc.id
from public.trade_categories tc
on conflict (source_trade_category_id) do update set name = excluded.name, description = excluded.description, updated_at = now();

-- The supplier mirror must exist before the opportunity bridge can create rows.
-- Re-run the bridge for legacy opportunities now that the mapping exists.
do $$
declare
  v_row record;
begin
  for v_row in select ato.id from public.application_trade_opportunities ato order by ato.created_at loop
    perform public.sync_application_trade_opportunity_to_graph(v_row.id);
  end loop;
end;
$$;

-- Add default mappings for the bridge's initial markets. Specific mappings are
-- additive and can supersede these later without changing existing rows.
insert into public.supplier_need_mappings (supplier_category_id, need_category_id, match_weight, match_method)
select sc.id, nc.id, 0.5, 'legacy_default'
from public.supplier_categories sc
join public.need_categories nc on nc.market_id = (select om.id from public.opportunity_markets om where om.slug = 'moves_fitouts') and nc.is_default
on conflict (supplier_category_id, need_category_id) do nothing;

-- One final bridge pass after supplier/need configuration is seeded.
do $$
declare
  v_row record;
begin
  for v_row in select ato.id from public.application_trade_opportunities ato order by ato.created_at loop
    perform public.sync_application_trade_opportunity_to_graph(v_row.id);
  end loop;
end;
$$;

-- Updated-at triggers for the new mutable tables.
do $$
declare
  v_table text;
begin
  for v_table in select unnest(array[
    'opportunity_markets','supplier_categories','need_categories','provider_config',
    'business_entities','business_locations','people','signals','opportunities',
    'customer_geographies','customer_preferences'
  ]) loop
    if not exists (
      select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
      where c.relname = v_table and t.tgname = 'graph_set_updated_at'
    ) then
      execute format('create trigger graph_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', v_table);
    end if;
  end loop;
end;
$$;

-- RLS and grants. Internal ingestion/source tables are admin/service-only;
-- customer-facing graph rows are visible only through a customer match.
do $$
declare
  v_table text;
begin
  for v_table in select unnest(array[
    'opportunity_markets','supplier_categories','need_categories','supplier_need_mappings',
    'provider_config','provider_data_rights','provider_usage','source_records',
    'business_entities','business_entity_aliases','business_locations','people',
    'company_people','contact_points','events','event_evidence','signals','signal_evidence',
    'opportunities','opportunity_signals','opportunity_needs','scoring_rules',
    'opportunity_scores','opportunity_score_factors','customer_geographies','customer_markets',
    'customer_preferences','opportunity_customer_matches','opportunity_contacts',
    'contact_enrichment_requests','contact_enrichment_results','opportunity_feedback'
  ]) loop
    execute format('alter table public.%I enable row level security', v_table);
  end loop;
end;
$$;

revoke all on table
  public.opportunity_markets, public.supplier_categories, public.need_categories,
  public.supplier_need_mappings, public.provider_config, public.provider_data_rights,
  public.provider_usage, public.source_records, public.business_entities,
  public.business_entity_aliases, public.business_locations, public.people,
  public.company_people, public.contact_points, public.events, public.event_evidence,
  public.signals, public.signal_evidence, public.opportunities, public.opportunity_signals,
  public.opportunity_needs, public.scoring_rules, public.opportunity_scores,
  public.opportunity_score_factors, public.customer_geographies, public.customer_markets,
  public.customer_preferences, public.opportunity_customer_matches, public.opportunity_contacts,
  public.contact_enrichment_requests, public.contact_enrichment_results, public.opportunity_feedback
from anon, authenticated;

grant select on table public.opportunity_markets, public.supplier_categories, public.need_categories to anon, authenticated;
grant select on table public.provider_config, public.provider_data_rights, public.provider_usage, public.source_records to authenticated;
grant select on table
  public.business_entities, public.business_entity_aliases, public.business_locations, public.people,
  public.company_people, public.contact_points, public.events, public.event_evidence, public.signals,
  public.signal_evidence, public.opportunities, public.opportunity_signals, public.opportunity_needs,
  public.opportunity_scores, public.opportunity_score_factors, public.opportunity_customer_matches,
  public.opportunity_contacts to authenticated;
grant select, insert, update, delete on table public.customer_geographies, public.customer_preferences to authenticated;
grant select on table public.customer_markets to authenticated;
grant select, insert on table public.opportunity_feedback to authenticated;
grant all on table
  public.opportunity_markets, public.supplier_categories, public.need_categories,
  public.supplier_need_mappings, public.provider_config, public.provider_data_rights,
  public.provider_usage, public.source_records, public.business_entities,
  public.business_entity_aliases, public.business_locations, public.people,
  public.company_people, public.contact_points, public.events, public.event_evidence,
  public.signals, public.signal_evidence, public.opportunities, public.opportunity_signals,
  public.opportunity_needs, public.scoring_rules, public.opportunity_scores,
  public.opportunity_score_factors, public.customer_geographies, public.customer_markets,
  public.customer_preferences, public.opportunity_customer_matches, public.opportunity_contacts,
  public.contact_enrichment_requests, public.contact_enrichment_results, public.opportunity_feedback
to service_role;

create policy graph_reference_markets_read on public.opportunity_markets
for select to anon, authenticated using (is_active);
create policy graph_reference_suppliers_read on public.supplier_categories
for select to anon, authenticated using (is_active);
create policy graph_reference_needs_read on public.need_categories
for select to anon, authenticated using (is_active);

create policy graph_provider_config_admin_read on public.provider_config
for select to authenticated using ((select public.is_platform_admin()));
create policy graph_provider_rights_admin_read on public.provider_data_rights
for select to authenticated using ((select public.is_platform_admin()));
create policy graph_provider_usage_admin_read on public.provider_usage
for select to authenticated using ((select public.is_platform_admin()));
create policy graph_source_records_admin_read on public.source_records
for select to authenticated using ((select public.is_platform_admin()));

create policy graph_opportunities_read on public.opportunities
for select to authenticated using ((select private.graph_opportunity_visible(opportunities.id)));
create policy graph_opportunity_signals_read on public.opportunity_signals
for select to authenticated using ((select private.graph_opportunity_visible(opportunity_signals.opportunity_id)));
create policy graph_opportunity_needs_read on public.opportunity_needs
for select to authenticated using ((select private.graph_opportunity_visible(opportunity_needs.opportunity_id)));
create policy graph_opportunity_scores_read on public.opportunity_scores
for select to authenticated using ((select private.graph_opportunity_visible(opportunity_scores.opportunity_id)));
create policy graph_opportunity_score_factors_read on public.opportunity_score_factors
for select to authenticated using (
  exists (select 1 from public.opportunity_scores s where s.id = opportunity_score_factors.opportunity_score_id and (select private.graph_opportunity_visible(s.opportunity_id)))
);
create policy graph_opportunity_matches_read on public.opportunity_customer_matches
for select to authenticated using ((select public.is_company_member(company_id)));
create policy graph_opportunity_contacts_read on public.opportunity_contacts
for select to authenticated using ((select private.graph_opportunity_visible(opportunity_id)));

create policy graph_entities_read on public.business_entities
for select to authenticated using (
  exists (select 1 from public.opportunities o where o.entity_id = business_entities.id and (select private.graph_opportunity_visible(o.id)))
);
create policy graph_aliases_read on public.business_entity_aliases
for select to authenticated using (
  exists (select 1 from public.opportunities o join public.business_entities e on e.id = o.entity_id where e.id = business_entity_aliases.entity_id and (select private.graph_opportunity_visible(o.id)))
);
create policy graph_locations_read on public.business_locations
for select to authenticated using (
  exists (select 1 from public.opportunities o where o.location_id = business_locations.id and (select private.graph_opportunity_visible(o.id)))
);
create policy graph_people_read on public.people
for select to authenticated using (
  exists (select 1 from public.opportunity_contacts oc join public.opportunities o on o.id = oc.opportunity_id where oc.person_id = people.id and (select private.graph_opportunity_visible(o.id)))
);
create policy graph_company_people_read on public.company_people
for select to authenticated using (
  exists (select 1 from public.opportunity_contacts oc join public.people p on p.id = oc.person_id join public.opportunities o on o.entity_id = company_people.entity_id where p.id = company_people.person_id and (select private.graph_opportunity_visible(o.id)))
);
create policy graph_contact_points_read on public.contact_points
for select to authenticated using (
  exists (select 1 from public.opportunity_contacts oc join public.opportunities o on o.id = oc.opportunity_id where oc.contact_point_id = contact_points.id and (select private.graph_opportunity_visible(o.id)))
);
create policy graph_events_read on public.events
for select to authenticated using (
  exists (select 1 from public.signal_evidence se join public.signals s on s.id = se.signal_id join public.opportunity_signals os on os.signal_id = s.id where se.event_id = events.id and (select private.graph_opportunity_visible(os.opportunity_id)))
);
create policy graph_event_evidence_read on public.event_evidence
for select to authenticated using (
  exists (select 1 from public.events e join public.signal_evidence se on se.event_id = e.id join public.opportunity_signals os on os.signal_id = se.signal_id where e.id = event_evidence.event_id and (select private.graph_opportunity_visible(os.opportunity_id)))
);
create policy graph_signals_read on public.signals
for select to authenticated using (
  exists (select 1 from public.opportunity_signals os where os.signal_id = signals.id and (select private.graph_opportunity_visible(os.opportunity_id)))
);
create policy graph_signal_evidence_read on public.signal_evidence
for select to authenticated using (
  exists (select 1 from public.opportunity_signals os where os.signal_id = signal_evidence.signal_id and (select private.graph_opportunity_visible(os.opportunity_id)))
);

create policy graph_customer_geographies_member_read on public.customer_geographies
for select to authenticated using ((select public.is_company_member(company_id)));
create policy graph_customer_geographies_admin_insert on public.customer_geographies
for insert to authenticated with check ((select public.is_company_admin(company_id)));
create policy graph_customer_geographies_admin_update on public.customer_geographies
for update to authenticated using ((select public.is_company_admin(company_id))) with check ((select public.is_company_admin(company_id)));
create policy graph_customer_geographies_admin_delete on public.customer_geographies
for delete to authenticated using ((select public.is_company_admin(company_id)));

create policy graph_customer_markets_member_read on public.customer_markets
for select to authenticated using ((select public.is_company_member(company_id)));
create policy graph_customer_preferences_member_read on public.customer_preferences
for select to authenticated using ((select public.is_company_member(company_id)));
create policy graph_customer_preferences_admin_insert on public.customer_preferences
for insert to authenticated with check ((select public.is_company_admin(company_id)));
create policy graph_customer_preferences_admin_update on public.customer_preferences
for update to authenticated using ((select public.is_company_admin(company_id))) with check ((select public.is_company_admin(company_id)));
create policy graph_customer_preferences_admin_delete on public.customer_preferences
for delete to authenticated using ((select public.is_company_admin(company_id)));

create policy graph_feedback_member_read on public.opportunity_feedback
for select to authenticated using ((select public.is_company_member(company_id)));
create policy graph_feedback_member_insert on public.opportunity_feedback
for insert to authenticated with check (
  (select public.is_company_member(company_id))
  and (select private.graph_opportunity_visible(opportunity_id))
);

-- Keep internal graph mutations and functions service-role only.
revoke all on function public.sync_planning_application_to_graph(uuid) from public, anon, authenticated;
revoke all on function public.sync_application_trade_opportunity_to_graph(uuid) from public, anon, authenticated;
revoke all on function public.sync_legacy_lead_match_to_graph(uuid) from public, anon, authenticated;
