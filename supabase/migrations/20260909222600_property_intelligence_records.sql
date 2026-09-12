create table if not exists public.property_intelligence_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  planning_application_id uuid not null references public.planning_applications(id) on delete cascade,
  provider text not null,
  uprn text not null,
  match_method text not null default 'postcode_address',
  match_confidence numeric not null default 0,
  matched_address text,
  postcode text,
  estimated_value_gbp numeric,
  value_min_gbp numeric,
  value_max_gbp numeric,
  avm_confidence numeric,
  bedrooms integer,
  bathrooms integer,
  garden boolean,
  parking boolean,
  latest_trigger_type text,
  latest_trigger_date date,
  last_transaction_date date,
  last_transaction_price_gbp numeric,
  likely_to_sell_percentile numeric,
  timing_signal text not null default 'neutral' check (timing_signal in ('strong','positive','neutral','caution')),
  timing_reasons jsonb not null default '[]'::jsonb,
  trigger_history jsonb not null default '[]'::jsonb,
  transaction_history jsonb not null default '[]'::jsonb,
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, opportunity_id, provider)
);

create index if not exists property_intelligence_records_company_opportunity_idx
  on public.property_intelligence_records(company_id, opportunity_id, retrieved_at desc);
create index if not exists property_intelligence_records_uprn_idx
  on public.property_intelligence_records(uprn);

alter table public.property_intelligence_records enable row level security;

create policy "members can read own property intelligence"
  on public.property_intelligence_records
  for select to authenticated
  using (public.is_company_member(company_id));

revoke insert, update, delete on public.property_intelligence_records from authenticated;
grant select on public.property_intelligence_records to authenticated;
