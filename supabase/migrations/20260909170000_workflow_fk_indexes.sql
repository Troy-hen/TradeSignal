-- Index the foreign-key columns used by workflow and provenance joins.
-- This keeps member-scoped lookups and cleanup paths on index scans as these
-- tables grow.

create index if not exists ai_outreach_generations_opportunity_idx
  on public.ai_outreach_generations (opportunity_id);
create index if not exists ai_outreach_generations_user_idx
  on public.ai_outreach_generations (user_id);

create index if not exists contact_enrichment_lookups_application_idx
  on public.contact_enrichment_lookups (planning_application_id);
create index if not exists contact_enrichment_lookups_user_idx
  on public.contact_enrichment_lookups (user_id);

create index if not exists contact_enrichment_records_application_idx
  on public.contact_enrichment_records (planning_application_id);

create index if not exists lead_follow_ups_completed_by_idx
  on public.lead_follow_ups (completed_by);
create index if not exists lead_follow_ups_created_by_idx
  on public.lead_follow_ups (created_by);
