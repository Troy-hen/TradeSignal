-- Enable RLS on every table and define policies. Table-level GRANTs to
-- anon/authenticated are already broad by default on this Supabase project —
-- RLS policies (or their absence) are the actual enforcement boundary.
-- Tables with no INSERT/UPDATE/DELETE policy for authenticated are
-- deliberately client-write-closed: mutation happens only through the
-- SECURITY DEFINER RPCs below or the service-role webhook/Edge Function
-- paths, both of which bypass RLS via table ownership.

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update using (id = (select auth.uid()));

alter table public.companies enable row level security;
create policy "companies_select_member" on public.companies for select using (id in (select public.auth_company_ids()));
create policy "companies_update_admin" on public.companies for update using (public.is_company_admin(id));

alter table public.company_memberships enable row level security;
create policy "company_memberships_select_member" on public.company_memberships for select using (public.is_company_member(company_id));

alter table public.admin_users enable row level security;
create policy "admin_users_select_admin" on public.admin_users for select using (public.is_platform_admin());

alter table public.trade_categories enable row level security;
create policy "trade_categories_select_all" on public.trade_categories for select using (true);

alter table public.postcode_districts enable row level security;
create policy "postcode_districts_select_all" on public.postcode_districts for select using (true);

alter table public.company_trade_profiles enable row level security;
create policy "company_trade_profiles_select" on public.company_trade_profiles for select using (public.is_company_member(company_id));
create policy "company_trade_profiles_insert" on public.company_trade_profiles for insert with check (public.is_company_admin(company_id));
create policy "company_trade_profiles_update" on public.company_trade_profiles for update using (public.is_company_admin(company_id));
create policy "company_trade_profiles_delete" on public.company_trade_profiles for delete using (public.is_company_admin(company_id));

-- territories IS the public pricing page: price/active flag only, never claim/company data.
alter table public.territories enable row level security;
create policy "territories_select_all" on public.territories for select using (true);

-- No INSERT/UPDATE policy at all: every mutation goes through reserve_territory()
-- or the Stripe-webhook service-role path.
alter table public.territory_claims enable row level security;
create policy "territory_claims_select_member" on public.territory_claims for select using (public.is_company_member(company_id));

alter table public.territory_waitlist enable row level security;
create policy "territory_waitlist_select" on public.territory_waitlist for select using (public.is_company_member(company_id));
create policy "territory_waitlist_insert" on public.territory_waitlist for insert with check (public.is_company_member(company_id));

-- Centrally-owned planning data: no client writes at all. Read access is
-- gated by an active lead_match, not by anything the frontend controls.
alter table public.planning_applications enable row level security;
create policy "planning_applications_select" on public.planning_applications for select
  using (public.is_platform_admin() or public.has_active_lead_match(id));

alter table public.planning_application_updates enable row level security;
create policy "planning_application_updates_select" on public.planning_application_updates for select
  using (public.is_platform_admin() or public.has_active_lead_match(planning_application_id));

alter table public.application_classifications enable row level security;
create policy "application_classifications_select" on public.application_classifications for select
  using (public.is_platform_admin() or public.has_active_lead_match(planning_application_id));

alter table public.application_trade_opportunities enable row level security;
create policy "application_trade_opportunities_select" on public.application_trade_opportunities for select
  using (public.is_platform_admin() or public.has_active_lead_match_for_opportunity(id));

alter table public.ai_prompt_versions enable row level security;
create policy "ai_prompt_versions_select_admin" on public.ai_prompt_versions for select using (public.is_platform_admin());

alter table public.ai_enrichment_runs enable row level security;
create policy "ai_enrichment_runs_select_admin" on public.ai_enrichment_runs for select using (public.is_platform_admin());

-- lead_matches gates access to the shared planning data above — it cannot be
-- client-writable or that gate is meaningless. Written only by DB triggers /
-- service-role Edge Functions.
alter table public.lead_matches enable row level security;
create policy "lead_matches_select" on public.lead_matches for select using (company_id in (select public.auth_company_ids()));

alter table public.lead_actions enable row level security;
create policy "lead_actions_select" on public.lead_actions for select using (company_id in (select public.auth_company_ids()));
create policy "lead_actions_insert" on public.lead_actions for insert with check (
  company_id in (select public.auth_company_ids())
  and exists (
    select 1 from public.lead_matches lm
    where lm.id = lead_match_id and lm.company_id = lead_actions.company_id
  )
);
create policy "lead_actions_update" on public.lead_actions for update using (
  created_by = (select auth.uid()) or public.is_company_admin(company_id)
);
create policy "lead_actions_delete" on public.lead_actions for delete using (
  created_by = (select auth.uid()) or public.is_company_admin(company_id)
);

-- Stripe webhook (service-role) only. No client writes.
alter table public.subscriptions enable row level security;
create policy "subscriptions_select" on public.subscriptions for select using (company_id in (select public.auth_company_ids()));

alter table public.notification_preferences enable row level security;
create policy "notification_preferences_select" on public.notification_preferences for select using (
  company_id in (select public.auth_company_ids())
  and (user_id is null or user_id = (select auth.uid()))
);
create policy "notification_preferences_insert_default" on public.notification_preferences for insert with check (
  user_id is null and public.is_company_admin(company_id)
);
create policy "notification_preferences_insert_own" on public.notification_preferences for insert with check (
  user_id = (select auth.uid()) and company_id in (select public.auth_company_ids())
);
create policy "notification_preferences_update_default" on public.notification_preferences for update using (
  user_id is null and public.is_company_admin(company_id)
);
create policy "notification_preferences_update_own" on public.notification_preferences for update using (
  user_id = (select auth.uid())
);

alter table public.notification_log enable row level security;
create policy "notification_log_select" on public.notification_log for select using (company_id in (select public.auth_company_ids()));

alter table public.ingestion_runs enable row level security;
create policy "ingestion_runs_select_admin" on public.ingestion_runs for select using (public.is_platform_admin());

alter table public.stripe_events enable row level security;
create policy "stripe_events_select_admin" on public.stripe_events for select using (public.is_platform_admin());

-- No policy at all: zero client SELECT, written only by the availability-check
-- RPC / service role (default-deny once RLS is enabled with no matching policy).
alter table public.rate_limit_events enable row level security;

alter table public.audit_logs enable row level security;
create policy "audit_logs_select_admin" on public.audit_logs for select using (public.is_platform_admin());

-- Note: public.spatial_ref_sys (a PostGIS system table of EPSG projection
-- definitions, owned by the extension installer role) is flagged by the
-- Supabase advisor for having RLS disabled. It is harmless public reference
-- data with no tenant/business data, and this migration role does not own
-- the table so cannot ALTER it — an accepted, known exception. See README
-- "Security model" for how to close it as a superuser if desired.

-- Company creation + membership management RPCs. These resolve tenant
-- identity from (select auth.uid()) server-side — never from a client-supplied
-- company_id/user_id — and are the only path that can create a company or
-- change membership, since company_memberships/companies have no direct
-- client INSERT policy.

create or replace function public.create_company_and_claim_ownership(
  p_trading_name text,
  p_billing_email text
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.companies (trading_name, billing_email)
  values (p_trading_name, p_billing_email)
  returning * into v_company;

  insert into public.company_memberships (company_id, user_id, role, status, joined_at)
  values (v_company.id, (select auth.uid()), 'owner', 'active', now());

  insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, after_state)
  values ('user', (select auth.uid()), 'company.created', 'company', v_company.id, to_jsonb(v_company));

  return v_company;
end;
$$;
revoke all on function public.create_company_and_claim_ownership(text, text) from public;
grant execute on function public.create_company_and_claim_ownership(text, text) to authenticated;

create or replace function public.invite_company_member(
  p_company_id uuid,
  p_invited_email text,
  p_role public.company_member_role default 'member'
)
returns public.company_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.company_memberships;
begin
  if not public.is_company_admin(p_company_id) then
    raise exception 'not_authorized';
  end if;

  insert into public.company_memberships (company_id, invited_email, role, status, invited_at)
  values (p_company_id, lower(p_invited_email), p_role, 'invited', now())
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.invite_company_member(uuid, text, public.company_member_role) from public;
grant execute on function public.invite_company_member(uuid, text, public.company_member_role) to authenticated;

create or replace function public.accept_company_invite(p_company_id uuid)
returns public.company_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.company_memberships;
  v_email text;
begin
  select email into v_email from auth.users where id = (select auth.uid());

  update public.company_memberships
  set user_id = (select auth.uid()), status = 'active', joined_at = now()
  where company_id = p_company_id
    and invited_email = lower(v_email)
    and status = 'invited'
    and user_id is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'no_matching_invite';
  end if;

  return v_row;
end;
$$;
revoke all on function public.accept_company_invite(uuid) from public;
grant execute on function public.accept_company_invite(uuid) to authenticated;

create or replace function public.remove_company_member(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_role public.company_member_role;
  v_owner_count integer;
begin
  select company_id, role into v_company_id, v_role
  from public.company_memberships where id = p_membership_id;

  if v_company_id is null then
    raise exception 'not_found';
  end if;

  if not public.is_company_admin(v_company_id) then
    raise exception 'not_authorized';
  end if;

  if v_role = 'owner' then
    select count(*) into v_owner_count
    from public.company_memberships
    where company_id = v_company_id and role = 'owner' and status = 'active';

    if v_owner_count <= 1 then
      raise exception 'cannot_remove_last_owner';
    end if;
  end if;

  update public.company_memberships set status = 'removed' where id = p_membership_id;

  insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id)
  values ('user', (select auth.uid()), 'company_member.removed', 'company_membership', p_membership_id);
end;
$$;
revoke all on function public.remove_company_member(uuid) from public;
grant execute on function public.remove_company_member(uuid) to authenticated;
