alter table public.epc_intelligence_records
  add column if not exists certificate_scope text not null default 'domestic',
  add column if not exists energy_mix text,
  add column if not exists fuel_sources text[] not null default '{}'::text[],
  add column if not exists has_heat_pump boolean,
  add column if not exists has_solar_pv boolean,
  add column if not exists renewable_sources text[] not null default '{}'::text[],
  add column if not exists air_conditioning boolean,
  add column if not exists other_fuel_description text,
  add column if not exists energy_consumption_current numeric,
  add column if not exists co2_emissions_current numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'epc_intelligence_records_scope_check'
  ) then
    alter table public.epc_intelligence_records
      add constraint epc_intelligence_records_scope_check
      check (certificate_scope in ('domestic','non_domestic','display'));
  end if;
end $$;

insert into public.assistant_knowledge_documents (slug,title,category,body,is_active,metadata)
values (
  'energy-intelligence-and-building-use',
  'Energy intelligence and building use',
  'energy_intelligence',
  'MyTradeBox Energy Intelligence can use official Energy Performance of Buildings data for domestic and non-domestic premises. It can surface EPC rating, floor area, building use, heating and fuel evidence, energy mix, heat pumps, solar PV, solar thermal, air conditioning, building fabric and improvement headroom when those facts are present in the certificate. These are contextual signals, not proof that an owner or occupier intends to purchase work. Non-domestic energy intelligence is relevant to shops, offices and other commercial premises as well as residential projects. Commercial opportunities should be assessed using the same core workflow: project relevance, trade fit, value, timing, organisation or decision-maker context, outreach route and outcome. Consumer contact restrictions must not be copied blindly to business-to-business opportunities; business outreach still needs an appropriate lawful and professional approach.',
  true,
  jsonb_build_object('source','product_policy','updated_for','non_domestic_epc')
)
on conflict (slug) do update set body=excluded.body,title=excluded.title,category=excluded.category,is_active=true,metadata=excluded.metadata,updated_at=now();

insert into public.assistant_knowledge_chunks (document_id,chunk_index,heading,content,embedding)
select d.id,0,'Energy intelligence and commercial buildings',d.body,null
from public.assistant_knowledge_documents d where d.slug='energy-intelligence-and-building-use'
on conflict (document_id,chunk_index) do update set heading=excluded.heading,content=excluded.content,embedding=null,updated_at=now();
