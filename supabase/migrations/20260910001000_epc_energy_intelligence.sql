create table if not exists public.epc_intelligence_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  planning_application_id uuid not null references public.planning_applications(id) on delete cascade,
  certificate_number text not null,
  uprn text,
  matched_address text,
  postcode text,
  match_confidence numeric not null default 0 check (match_confidence >= 0 and match_confidence <= 1),
  current_band text,
  current_efficiency integer,
  potential_band text,
  potential_efficiency integer,
  property_type text,
  built_form text,
  floor_area numeric,
  construction_age_band text,
  main_heating_description text,
  main_fuel text,
  roof_description text,
  windows_description text,
  walls_description text,
  mains_gas boolean,
  solar_water_heating boolean,
  improvement_signals text[] not null default '{}',
  signal_summary text,
  registration_date date,
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(company_id, opportunity_id)
);

create index if not exists epc_intelligence_company_opportunity_idx on public.epc_intelligence_records(company_id, opportunity_id);
create index if not exists epc_intelligence_uprn_idx on public.epc_intelligence_records(uprn) where uprn is not null;

alter table public.epc_intelligence_records enable row level security;
revoke all on public.epc_intelligence_records from anon;
revoke all on public.epc_intelligence_records from public;
grant select on public.epc_intelligence_records to authenticated;

drop policy if exists epc_intelligence_member_select on public.epc_intelligence_records;
create policy epc_intelligence_member_select on public.epc_intelligence_records
for select to authenticated
using (public.is_company_member(company_id));

insert into public.assistant_knowledge_documents (slug,title,category,body,is_active,metadata)
values (
  'epc-energy-intelligence',
  'EPC energy intelligence',
  'opportunity-intelligence',
  'MyTradeBox can enrich an unlocked planning opportunity with Energy Performance Certificate data for England and Wales when the project address can be confidently matched. EPC intelligence is supporting context, not proof that a specific improvement will be purchased. Useful fields include current and potential energy-efficiency bands, floor area, construction age, heating/fuel context, and roof, window and wall descriptions. MyTradeBox may highlight commercially relevant energy-efficiency signals for trades such as renewables, heating, roofing and windows, but must distinguish observed certificate facts from inferred opportunity signals. EPC data does not provide permission to contact a homeowner electronically.',
  true,
  jsonb_build_object('source','MHCLG Energy Performance of Buildings API','coverage','England and Wales')
)
on conflict (slug) do update set title=excluded.title, category=excluded.category, body=excluded.body, is_active=true, metadata=excluded.metadata, updated_at=now();

insert into public.assistant_knowledge_chunks (document_id,chunk_index,heading,content,embedding)
select d.id,0,'Using EPC energy intelligence',d.body,null
from public.assistant_knowledge_documents d where d.slug='epc-energy-intelligence'
on conflict (document_id,chunk_index) do update set heading=excluded.heading, content=excluded.content, embedding=null, updated_at=now();