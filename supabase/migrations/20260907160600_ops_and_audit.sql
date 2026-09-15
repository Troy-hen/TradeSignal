create table public.ingestion_runs (
  id                       uuid primary key default gen_random_uuid(),
  provider                 text not null default 'plota',
  run_type                 text not null check (run_type in ('scheduled_new', 'scheduled_updated', 'manual_backfill')),
  started_at                timestamptz not null default now(),
  finished_at                 timestamptz,
  status                        text not null default 'running' check (status in ('running', 'completed', 'failed', 'partial')),
  applications_fetched             integer not null default 0,
  applications_created               integer not null default 0,
  applications_updated                 integer not null default 0,
  applications_unchanged                  integer not null default 0,
  errors_count                              integer not null default 0,
  error_details                               jsonb,
  cursor_from                                  jsonb,
  cursor_to                                      jsonb,
  created_at                                      timestamptz not null default now()
);
create index ingestion_runs_provider_idx on public.ingestion_runs (provider, started_at desc);

-- Idempotency ledger for Stripe webhooks: Stripe can and does retry deliveries.
create table public.stripe_events (
  id            text primary key,
  type          text not null,
  payload       jsonb not null,
  processed_at  timestamptz not null default now()
);

-- Secondary/portable rate-limit layer behind Cloudflare's edge binding — also
-- works in local dev where the binding isn't present.
create table public.rate_limit_events (
  id           uuid primary key default gen_random_uuid(),
  scope        text not null,
  identifier   text not null,
  created_at   timestamptz not null default now()
);
create index rate_limit_events_scope_idx on public.rate_limit_events (scope, identifier, created_at);

create table public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_type     text not null check (actor_type in ('user', 'system', 'admin', 'webhook')),
  actor_id       uuid,
  action         text not null,
  entity_type    text,
  entity_id      uuid,
  before_state   jsonb,
  after_state    jsonb,
  ip_address     inet,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_created_at_brin_idx on public.audit_logs using brin (created_at);
