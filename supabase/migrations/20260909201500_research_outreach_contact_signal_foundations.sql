create table if not exists public.opportunity_research_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  status text not null check (status in ('running','completed','failed')),
  summary text,
  report jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  model text,
  input_hash text,
  generated_by uuid,
  generated_at timestamptz,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists opportunity_research_reports_lookup_idx on public.opportunity_research_reports(company_id, opportunity_id, created_at desc);
alter table public.opportunity_research_reports enable row level security;
create policy "members can read own research reports" on public.opportunity_research_reports for select to authenticated using (public.is_company_member(company_id));
create policy "members can create own research reports" on public.opportunity_research_reports for insert to authenticated with check (public.is_company_member(company_id) and (generated_by is null or generated_by = auth.uid()));
create policy "members can update own research reports" on public.opportunity_research_reports for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create table if not exists public.contact_intelligence_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  planning_application_id uuid not null references public.planning_applications(id) on delete cascade,
  provider text not null,
  entity_type text not null check (entity_type in ('person','organisation')),
  person_name text,
  organisation_name text,
  job_title text,
  email text,
  phone text,
  website text,
  source_url text,
  confidence numeric,
  lawful_basis text,
  purpose text,
  raw_payload jsonb not null default '{}'::jsonb,
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz,
  suppression_status text not null default 'active' check (suppression_status in ('active','suppressed','expired')),
  created_at timestamptz not null default now()
);
create index if not exists contact_intelligence_records_lookup_idx on public.contact_intelligence_records(company_id, opportunity_id, retrieved_at desc);
alter table public.contact_intelligence_records enable row level security;
create policy "members can read own contact intelligence" on public.contact_intelligence_records for select to authenticated using (public.is_company_member(company_id));
revoke insert, update, delete on public.contact_intelligence_records from authenticated;

create table if not exists public.opportunity_activity_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  lead_match_id uuid references public.lead_matches(id) on delete set null,
  event_type text not null,
  channel text,
  provider text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists opportunity_activity_events_lookup_idx on public.opportunity_activity_events(company_id, opportunity_id, occurred_at desc);
alter table public.opportunity_activity_events enable row level security;
create policy "members can read own activity" on public.opportunity_activity_events for select to authenticated using (public.is_company_member(company_id));
create policy "members can create own activity" on public.opportunity_activity_events for insert to authenticated with check (public.is_company_member(company_id) and (created_by is null or created_by = auth.uid()));
revoke update, delete on public.opportunity_activity_events from authenticated;

create table if not exists public.outreach_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  lead_match_id uuid references public.lead_matches(id) on delete set null,
  channel text not null check (channel in ('letter','email')),
  provider text,
  provider_job_id text,
  status text not null default 'draft' check (status in ('draft','queued','sent','delivered','failed','cancelled')),
  recipient_name text,
  recipient_address jsonb,
  content_snapshot text,
  cost_pence integer,
  currency text not null default 'GBP',
  tracking_url text,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outreach_deliveries_lookup_idx on public.outreach_deliveries(company_id, opportunity_id, created_at desc);
alter table public.outreach_deliveries enable row level security;
create policy "members can read own deliveries" on public.outreach_deliveries for select to authenticated using (public.is_company_member(company_id));
create policy "members can create draft deliveries" on public.outreach_deliveries for insert to authenticated with check (public.is_company_member(company_id) and status='draft' and (created_by is null or created_by=auth.uid()));
revoke update, delete on public.outreach_deliveries from authenticated;

create table if not exists public.market_signals (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_signal_id text not null,
  signal_type text not null,
  title text not null,
  summary text,
  location_text text,
  postcode_district text,
  latitude double precision,
  longitude double precision,
  estimated_project_value_low numeric,
  estimated_project_value_high numeric,
  source_url text,
  published_at timestamptz,
  content_hash text,
  raw_payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, source_signal_id)
);
create index if not exists market_signals_postcode_idx on public.market_signals(postcode_district, published_at desc);
alter table public.market_signals enable row level security;
revoke all on public.market_signals from anon, authenticated;

create table if not exists public.market_signal_trade_matches (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.market_signals(id) on delete cascade,
  trade_category_id uuid not null references public.trade_categories(id) on delete cascade,
  fit_score numeric,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  recommended_action text,
  ai_confidence numeric,
  created_at timestamptz not null default now(),
  unique(signal_id, trade_category_id)
);
alter table public.market_signal_trade_matches enable row level security;
revoke all on public.market_signal_trade_matches from anon, authenticated;
