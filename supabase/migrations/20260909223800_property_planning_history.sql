alter table public.property_intelligence_records
  add column if not exists planning_history jsonb not null default '[]'::jsonb;
