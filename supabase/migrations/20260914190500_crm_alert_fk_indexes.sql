-- Cover nullable creator and delivery foreign keys used by company-scoped
-- administration and idempotency lookups.
create index if not exists crm_connections_created_by_idx
  on public.crm_connections(created_by);
create index if not exists crm_delivery_log_lead_unlock_idx
  on public.crm_delivery_log(lead_unlock_id);
create index if not exists alert_rules_created_by_idx
  on public.alert_rules(created_by);
