-- Consolidate notification_preferences' insert/update policies (one per
-- action instead of two OR'd permissive policies each) and add covering
-- indexes for foreign keys the performance advisor flagged.

drop policy "notification_preferences_insert_default" on public.notification_preferences;
drop policy "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert" on public.notification_preferences for insert with check (
  (user_id is null and public.is_company_admin(company_id))
  or (user_id = (select auth.uid()) and company_id in (select public.auth_company_ids()))
);

drop policy "notification_preferences_update_default" on public.notification_preferences;
drop policy "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update" on public.notification_preferences for update using (
  (user_id is null and public.is_company_admin(company_id))
  or (user_id = (select auth.uid()))
);

create index admin_users_granted_by_idx on public.admin_users (granted_by);
create index application_classifications_ai_run_idx on public.application_classifications (ai_enrichment_run_id);
create index application_trade_opportunities_classification_idx on public.application_trade_opportunities (application_classification_id);
create index company_trade_profiles_trade_category_idx on public.company_trade_profiles (trade_category_id);
create index lead_actions_created_by_idx on public.lead_actions (created_by);
create index lead_matches_territory_claim_idx on public.lead_matches (territory_claim_id);
create index notification_log_user_id_idx on public.notification_log (user_id);
create index notification_preferences_user_id_idx on public.notification_preferences (user_id);
create index territory_claims_created_by_idx on public.territory_claims (created_by);
create index territory_waitlist_company_idx on public.territory_waitlist (company_id);
create index territory_waitlist_trade_category_idx on public.territory_waitlist (trade_category_id);
