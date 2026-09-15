-- Companies House is business context, not a standalone buying signal.
-- Keep it available for entity resolution and later enrichment, but require
-- an independent event/signal before customer-facing opportunity creation.
update public.b2b_source_eligibility_rules
set
  b2b_status = 'contact_only',
  include_in_signal_generation = false,
  include_in_customer_opportunities = false,
  notes = 'Registered business context can resolve and enrich an entity; it does not create a customer opportunity without an independent buying signal.'
where provider_key = 'companies_house'
  and record_type = 'company';

insert into public.b2b_source_eligibility_rules (
  provider_key,
  record_type,
  b2b_status,
  include_in_entity_resolution,
  include_in_signal_generation,
  include_in_customer_opportunities,
  exclude_if_domestic,
  priority,
  notes
)
values (
  'companies_house',
  'company_search_result',
  'contact_only',
  true,
  false,
  false,
  false,
  90,
  'Search results are registry context only. Use them to resolve or enrich a business; require a separate buying signal for marketplace eligibility.'
)
on conflict (provider_key, record_type) do update
set
  b2b_status = excluded.b2b_status,
  include_in_entity_resolution = excluded.include_in_entity_resolution,
  include_in_signal_generation = excluded.include_in_signal_generation,
  include_in_customer_opportunities = excluded.include_in_customer_opportunities,
  exclude_if_domestic = excluded.exclude_if_domestic,
  priority = excluded.priority,
  notes = excluded.notes,
  updated_at = now();
