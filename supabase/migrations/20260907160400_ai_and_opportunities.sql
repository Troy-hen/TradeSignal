-- AI pipeline versioning, audit trail, and the trade-opportunity fan-out.
-- ai_prompt_versions lets us answer "these N opportunities used prompt v1.3"
-- and reprocess selectively. ai_enrichment_runs is the append-only audit log
-- of every AI call (success or failure). application_classifications holds
-- the CURRENT project-level classification (1:1 with the application);
-- application_trade_opportunities holds one row per relevant trade — the
-- core fan-out that lets one application match many non-competing
-- territory holders. AI-estimated values live here, structurally separate
-- from the factual planning_applications columns.

create table public.ai_prompt_versions (
  id              uuid primary key default gen_random_uuid(),
  task            text not null,
  version         text not null,
  model           text not null,
  system_prompt   text not null,
  schema_version  text not null,
  active          boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (task, version)
);
-- At most one active prompt per task at a time — same exclusivity idiom as territory_claims.
create unique index ai_prompt_versions_active_idx on public.ai_prompt_versions (task) where active = true;

create table public.ai_enrichment_runs (
  id                       uuid primary key default gen_random_uuid(),
  planning_application_id  uuid not null references public.planning_applications(id) on delete cascade,
  prompt_version_id        uuid not null references public.ai_prompt_versions(id),
  trigger_reason           text not null check (trigger_reason in
                              ('new_application', 'content_changed', 'manual_reprocess', 'prompt_version_upgrade')),
  provider                 text not null,
  model                    text not null,
  input_payload             jsonb not null,
  raw_response               jsonb,
  parsed_successfully         boolean not null,
  validation_errors            jsonb,
  input_tokens                  integer,
  output_tokens                   integer,
  total_tokens                      integer,
  latency_ms                          integer,
  status                                text not null check (status in ('success', 'failed', 'timeout')),
  error_message                          text,
  started_at                               timestamptz not null,
  completed_at                              timestamptz,
  created_at                                 timestamptz not null default now()
);
create index ai_enrichment_runs_app_id_idx on public.ai_enrichment_runs (planning_application_id, created_at desc);
create index ai_enrichment_runs_failed_idx on public.ai_enrichment_runs (status) where status != 'success';
create index ai_enrichment_runs_prompt_version_idx on public.ai_enrichment_runs (prompt_version_id);

create type public.classification_status as enum ('pending', 'completed', 'failed', 'stale');
create type public.project_size_category as enum ('small', 'medium', 'large', 'major');

create table public.application_classifications (
  id                                    uuid primary key default gen_random_uuid(),
  planning_application_id               uuid not null unique references public.planning_applications(id) on delete cascade,
  ai_enrichment_run_id                   uuid references public.ai_enrichment_runs(id),
  content_hash                            text,
  project_type                             text,
  project_size_category                     public.project_size_category,
  estimated_total_project_value_low          numeric,
  estimated_total_project_value_high          numeric,
  likely_start_window                          text,
  opportunity_timing                             text,
  summary                                         text,
  key_facts                                        jsonb,
  ai_confidence                                     numeric(4,3) check (ai_confidence between 0 and 1),
  classification_status                              public.classification_status not null default 'pending',
  attempts                                            integer not null default 0,
  last_classified_at                                   timestamptz,
  created_at                                            timestamptz not null default now(),
  updated_at                                             timestamptz not null default now()
);
create index application_classifications_status_idx on public.application_classifications (classification_status);
create index application_classifications_project_type_idx on public.application_classifications (project_type);

create type public.opportunity_bucket as enum ('hot', 'strong', 'possible', 'low');

create table public.application_trade_opportunities (
  id                              uuid primary key default gen_random_uuid(),
  planning_application_id         uuid not null references public.planning_applications(id) on delete cascade,
  application_classification_id   uuid not null references public.application_classifications(id),
  trade_category_id               uuid not null references public.trade_categories(id),
  fit_score                       numeric(5,2) not null check (fit_score between 0 and 100),
  match_reasons                   text[],
  likely_scope                    text[],
  estimated_trade_value_low       numeric,
  estimated_trade_value_high      numeric,
  recommended_action              text,
  recommended_contact_timing      text,
  risk_flags                      text[],
  ai_confidence                   numeric(4,3) check (ai_confidence between 0 and 1),
  opportunity_score                numeric(5,2),
  opportunity_bucket                 public.opportunity_bucket,
  score_formula_version                text,
  score_computed_at                      timestamptz,
  is_active                                boolean not null default true,
  postcode_district                         text not null,
  created_at                                 timestamptz not null default now(),
  updated_at                                  timestamptz not null default now(),
  unique (planning_application_id, trade_category_id)
);
create index application_trade_opportunities_trade_idx on public.application_trade_opportunities (trade_category_id);
create index application_trade_opportunities_score_idx on public.application_trade_opportunities (opportunity_score desc) where is_active = true;
create index application_trade_opportunities_match_idx on public.application_trade_opportunities (postcode_district, trade_category_id) where is_active = true;
create index application_trade_opportunities_app_idx on public.application_trade_opportunities (planning_application_id);
