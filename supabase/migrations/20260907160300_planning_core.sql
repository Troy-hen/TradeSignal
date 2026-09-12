-- Central planning data. One row per real-world application, deduplicated by
-- (provider, provider_application_id). Ingested once, enriched once, matched
-- to potentially many trade categories — never re-fetched/re-classified per
-- subscriber. status is normalized for filtering/scoring logic; status_raw is
-- the provider's verbatim council wording, kept for display only, never used
-- for filtering (councils word the same status hundreds of different ways).

create type public.planning_application_status as enum (
  'submitted', 'validated', 'under_consideration', 'decision_expected',
  'approved', 'rejected', 'withdrawn', 'appeal_lodged', 'unknown'
);

create table public.planning_applications (
  id                              uuid primary key default gen_random_uuid(),
  provider                        text not null default 'plota',
  provider_application_id         text not null,
  local_planning_authority        text,
  local_planning_authority_code   text,
  planning_reference              text not null,
  address_text                    text,
  postcode                        text,
  postcode_district                text generated always as (upper(split_part(trim(postcode), ' ', 1))) stored,
  latitude                         double precision,
  longitude                        double precision,
  location                         geography(Point, 4326),
  application_type                 text,
  proposal_description             text,
  status                            public.planning_application_status not null default 'unknown',
  status_raw                        text,
  decision_outcome_raw              text,
  received_date                     date,
  validated_date                    date,
  decision_due_date                 date,
  decision_date                     date,
  appeal_status                     text,
  dwelling_count                    integer,
  is_commercial                     boolean,
  floorspace_sqm                    numeric,
  -- Applicant/agent contact fields are only populated when the provider's
  -- contact-data add-on is explicitly enabled (off by default) — GDPR
  -- minimisation per the product's privacy requirements.
  applicant_name                    text,
  agent_company                     text,
  estimated_value_gbp                numeric,
  source_url                         text,
  raw_provider_payload                jsonb,
  content_hash                        text not null,
  provider_changed_at                 timestamptz,
  first_seen_at                       timestamptz not null default now(),
  last_seen_at                        timestamptz not null default now(),
  created_at                          timestamptz not null default now(),
  updated_at                          timestamptz not null default now(),
  unique (provider, provider_application_id)
);

-- No FK from postcode_district to postcode_districts: ingestion must never
-- fail-closed just because our static reference table has a gap. The
-- opposite tolerance from territories is deliberate.
create unique index planning_applications_lpa_ref_idx
  on public.planning_applications (local_planning_authority_code, planning_reference)
  where local_planning_authority_code is not null;

create index planning_applications_postcode_district_idx on public.planning_applications (postcode_district);
create index planning_applications_reference_idx on public.planning_applications (planning_reference);
create index planning_applications_status_idx on public.planning_applications (status);
create index planning_applications_received_date_idx on public.planning_applications (received_date);
create index planning_applications_provider_changed_at_idx on public.planning_applications (provider_changed_at);
create index planning_applications_location_idx on public.planning_applications using gist (location);

create type public.application_update_change_type as enum
  ('status_change', 'decision_recorded', 'date_updated', 'description_updated', 'other');

create table public.planning_application_updates (
  id                       uuid primary key default gen_random_uuid(),
  planning_application_id  uuid not null references public.planning_applications(id) on delete cascade,
  change_type               public.application_update_change_type not null,
  previous_status            public.planning_application_status,
  new_status                  public.planning_application_status,
  diff                         jsonb,
  detected_at                   timestamptz not null default now(),
  source_event_at                timestamptz,
  triggered_rescore                boolean not null default false,
  triggered_notification             boolean not null default false,
  created_at                          timestamptz not null default now()
);
create index planning_application_updates_app_id_idx on public.planning_application_updates (planning_application_id, detected_at desc);
create index planning_application_updates_notify_idx on public.planning_application_updates (change_type, triggered_notification) where triggered_notification = false;
