-- Alert delivery and CRM handoff foundations.
--
-- These tables intentionally store connection metadata, not provider tokens.
-- OAuth refresh tokens and webhook secrets belong in the provider secret store;
-- secret_ref is only an opaque reference to that secret.

create table if not exists public.crm_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  provider text not null check (provider in ('generic_webhook', 'hubspot', 'pipedrive', 'salesforce', 'dynamics', 'zoho')),
  label text not null,
  status text not null default 'pending' check (status in ('pending', 'connected', 'error', 'disconnected')),
  external_account_id text,
  external_account_name text,
  secret_ref text,
  scopes text[] not null default '{}'::text[],
  config jsonb not null default '{}'::jsonb,
  last_connected_at timestamptz,
  last_synced_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_connections_company_provider_label_key unique (company_id, provider, label)
);

create index if not exists crm_connections_company_status_idx
  on public.crm_connections(company_id, status, updated_at desc);

create table if not exists public.crm_field_mappings (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.crm_connections(id) on delete cascade,
  everro_field text not null,
  remote_field text not null,
  required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_field_mappings_connection_field_key unique (connection_id, everro_field)
);

create index if not exists crm_field_mappings_connection_idx
  on public.crm_field_mappings(connection_id);

create table if not exists public.crm_delivery_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  connection_id uuid not null references public.crm_connections(id) on delete cascade,
  lead_unlock_id uuid not null references public.lead_unlocks(id) on delete cascade,
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  remote_object_type text,
  remote_object_id text,
  request_metadata jsonb not null default '{}'::jsonb,
  response_metadata jsonb not null default '{}'::jsonb,
  error_message text,
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_delivery_log_connection_key unique (connection_id, idempotency_key)
);

create index if not exists crm_delivery_log_company_created_idx
  on public.crm_delivery_log(company_id, created_at desc);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  enabled boolean not null default true,
  min_score numeric(5, 2) not null default 90 check (min_score >= 0 and min_score <= 100),
  signal_families text[] not null default '{}'::text[],
  postcode_districts text[] not null default '{}'::text[],
  buying_windows text[] not null default '{}'::text[],
  channels text[] not null default array['banner']::text[]
    check (channels <@ array['banner', 'email', 'webhook', 'crm']::text[]),
  cadence text not null default 'instant' check (cadence in ('instant', 'daily', 'weekly')),
  max_per_digest integer not null default 5 check (max_per_digest between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alert_rules_company_name_key unique (company_id, name)
);

create index if not exists alert_rules_company_enabled_idx
  on public.alert_rules(company_id, enabled, updated_at desc);

alter table public.crm_connections enable row level security;
alter table public.crm_field_mappings enable row level security;
alter table public.crm_delivery_log enable row level security;
alter table public.alert_rules enable row level security;

drop policy if exists crm_connections_select_member on public.crm_connections;
create policy crm_connections_select_member on public.crm_connections
  for select to authenticated
  using (public.is_company_member(company_id));

drop policy if exists crm_connections_insert_admin on public.crm_connections;
create policy crm_connections_insert_admin on public.crm_connections
  for insert to authenticated
  with check (public.is_company_admin(company_id));

drop policy if exists crm_connections_update_admin on public.crm_connections;
create policy crm_connections_update_admin on public.crm_connections
  for update to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

drop policy if exists crm_connections_delete_admin on public.crm_connections;
create policy crm_connections_delete_admin on public.crm_connections
  for delete to authenticated
  using (public.is_company_admin(company_id));

drop policy if exists crm_field_mappings_select_member on public.crm_field_mappings;
create policy crm_field_mappings_select_member on public.crm_field_mappings
  for select to authenticated
  using (exists (
    select 1 from public.crm_connections c
    where c.id = connection_id and public.is_company_member(c.company_id)
  ));

drop policy if exists crm_field_mappings_insert_admin on public.crm_field_mappings;
create policy crm_field_mappings_insert_admin on public.crm_field_mappings
  for insert to authenticated
  with check (exists (
    select 1 from public.crm_connections c
    where c.id = connection_id and public.is_company_admin(c.company_id)
  ));

drop policy if exists crm_field_mappings_update_admin on public.crm_field_mappings;
create policy crm_field_mappings_update_admin on public.crm_field_mappings
  for update to authenticated
  using (exists (
    select 1 from public.crm_connections c
    where c.id = connection_id and public.is_company_admin(c.company_id)
  ))
  with check (exists (
    select 1 from public.crm_connections c
    where c.id = connection_id and public.is_company_admin(c.company_id)
  ));

drop policy if exists crm_field_mappings_delete_admin on public.crm_field_mappings;
create policy crm_field_mappings_delete_admin on public.crm_field_mappings
  for delete to authenticated
  using (exists (
    select 1 from public.crm_connections c
    where c.id = connection_id and public.is_company_admin(c.company_id)
  ));

drop policy if exists crm_delivery_log_select_member on public.crm_delivery_log;
create policy crm_delivery_log_select_member on public.crm_delivery_log
  for select to authenticated
  using (public.is_company_member(company_id));

drop policy if exists alert_rules_select_member on public.alert_rules;
create policy alert_rules_select_member on public.alert_rules
  for select to authenticated
  using (public.is_company_member(company_id));

drop policy if exists alert_rules_insert_admin on public.alert_rules;
create policy alert_rules_insert_admin on public.alert_rules
  for insert to authenticated
  with check (public.is_company_admin(company_id));

drop policy if exists alert_rules_update_admin on public.alert_rules;
create policy alert_rules_update_admin on public.alert_rules
  for update to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

drop policy if exists alert_rules_delete_admin on public.alert_rules;
create policy alert_rules_delete_admin on public.alert_rules
  for delete to authenticated
  using (public.is_company_admin(company_id));

drop trigger if exists crm_connections_updated_at on public.crm_connections;
create trigger crm_connections_updated_at before update on public.crm_connections
  for each row execute function public.set_updated_at();
drop trigger if exists crm_field_mappings_updated_at on public.crm_field_mappings;
create trigger crm_field_mappings_updated_at before update on public.crm_field_mappings
  for each row execute function public.set_updated_at();
drop trigger if exists crm_delivery_log_updated_at on public.crm_delivery_log;
create trigger crm_delivery_log_updated_at before update on public.crm_delivery_log
  for each row execute function public.set_updated_at();
drop trigger if exists alert_rules_updated_at on public.alert_rules;
create trigger alert_rules_updated_at before update on public.alert_rules
  for each row execute function public.set_updated_at();

-- Supabase projects created after the Data API exposure change need explicit
-- grants as well as RLS policies. No anonymous client may see connection data.
revoke all on table public.crm_connections, public.crm_field_mappings, public.crm_delivery_log, public.alert_rules from anon;
grant select, insert, update, delete on table public.crm_connections, public.crm_field_mappings, public.alert_rules to authenticated;
grant select on table public.crm_delivery_log to authenticated;

comment on table public.crm_connections is 'Company CRM metadata; provider tokens are held outside Postgres and referenced by secret_ref.';
comment on column public.crm_connections.secret_ref is 'Opaque provider-secret-store reference. Never store a raw OAuth token or webhook secret here.';
comment on table public.crm_delivery_log is 'Idempotent delivery audit for purchased lead pushes; written by server-side delivery workers.';
comment on table public.alert_rules is 'Company-configured hot-lead alert rules shared by the in-app banner and future email/webhook channels.';
