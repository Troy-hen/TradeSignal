-- SECURITY DEFINER helper functions that every RLS policy is written against.
-- Each is minimal (single-purpose, no dynamic SQL), sets an explicit
-- search_path (preventing search_path hijacking), and read-only checks are
-- marked STABLE so Postgres evaluates them once per query rather than once
-- per row. auth.uid() is wrapped as (select auth.uid()) throughout so the
-- planner treats it as an InitPlan, per current Supabase RLS performance
-- guidance. These functions are owned by the migration role, which also
-- owns every table below, so they transparently bypass RLS for their own
-- internal lookups while still resolving identity from the CALLING user's
-- own auth.uid() — never a client-supplied id.

create or replace function public.auth_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.company_memberships
  where user_id = (select auth.uid()) and status = 'active'
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_memberships
    where company_id = target_company_id
      and user_id = (select auth.uid())
      and status = 'active'
  )
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_memberships
    where company_id = target_company_id
      and user_id = (select auth.uid())
      and status = 'active'
      and role in ('owner', 'admin')
  )
$$;

create or replace function public.has_active_lead_match(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lead_matches lm
    join public.application_trade_opportunities ato on ato.id = lm.application_trade_opportunity_id
    where ato.planning_application_id = target_application_id
      and lm.company_id in (select public.auth_company_ids())
  )
$$;

create or replace function public.has_active_lead_match_for_opportunity(target_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lead_matches lm
    where lm.application_trade_opportunity_id = target_opportunity_id
      and lm.company_id in (select public.auth_company_ids())
  )
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where profile_id = (select auth.uid()))
$$;
