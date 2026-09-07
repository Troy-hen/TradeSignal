-- The security advisor caught a real gap: this Supabase project grants
-- EXECUTE on newly-created public-schema functions directly to the `anon`
-- and `authenticated` roles by default (the same default-privilege behaviour
-- already confirmed for table grants) — a plain `revoke ... from public` does
-- NOT remove that, since the grant isn't coming from the PUBLIC pseudo-role.
-- Fixing it requires revoking from the named roles explicitly.
--
-- Three genuinely different cases below:
-- 1. System-maintenance functions (cron-only) must not be callable by anyone
--    via the REST API at all — e.g. expire_stale_territory_reservations()
--    could otherwise be called by any anon visitor to grief other users'
--    in-progress checkouts by force-expiring their 15-minute reservation
--    early. Revoke from anon AND authenticated.
-- 2. API functions with an explicit "authenticated only, not anon" contract
--    (reserve_territory, browse_territory_opportunities, the membership
--    RPCs) currently also allow anon by default. Revoke from anon, keep
--    authenticated.
-- 3. Read-only helper functions used inside RLS policies (auth_company_ids,
--    is_company_member, etc.) are intentionally left as-is: each only ever
--    answers a question scoped to the CALLING user's own auth.uid(), so
--    direct RPC access reveals nothing a user couldn't already infer about
--    themselves — and the trigger functions among them (trg_*) cannot be
--    meaningfully invoked outside trigger context at all (Postgres errors
--    if you try). Revoking EXECUTE from these would require rewriting every
--    RLS policy that calls them (policy evaluation needs the querying role
--    to hold EXECUTE on the function, regardless of SECURITY DEFINER) for
--    no real security benefit — not worth the risk of breaking tenant
--    isolation this late. check_territory_availability is also unaffected:
--    both anon and authenticated are its intended callers.

revoke execute on function public.expire_stale_territory_reservations() from anon, authenticated;
revoke execute on function public.prune_rate_limit_events() from anon, authenticated;
revoke execute on function public.rescore_stale_opportunities() from anon, authenticated;

revoke execute on function public.reserve_territory(text, uuid) from anon;
revoke execute on function public.browse_territory_opportunities(text, uuid, int) from anon;
revoke execute on function public.create_company_and_claim_ownership(text, text) from anon;
revoke execute on function public.invite_company_member(uuid, text, public.company_member_role) from anon;
revoke execute on function public.accept_company_invite(uuid) from anon;
revoke execute on function public.remove_company_member(uuid) from anon;

-- compute_opportunity_score was missing an explicit search_path (flagged by
-- the advisor). It's IMMUTABLE and reads no tables, so the practical risk
-- was minimal, but every function gets a pinned search_path on principle.
create or replace function public.compute_opportunity_score(
  p_fit_score numeric,
  p_project_size public.project_size_category,
  p_trade_value_high numeric,
  p_status public.planning_application_status,
  p_decision_date date,
  p_received_date date,
  p_ai_confidence numeric
)
returns table (score numeric, bucket public.opportunity_bucket)
language plpgsql
immutable
set search_path = public
as $$
declare
  v_trade_fit numeric := coalesce(p_fit_score, 0);
  v_project_size numeric := case p_project_size
    when 'small' then 30 when 'medium' then 60 when 'large' then 85 when 'major' then 100
    else 50 end;
  v_trade_value numeric;
  v_recency numeric;
  v_days_elapsed numeric;
  v_stage_multiplier numeric;
  v_confidence_multiplier numeric := 0.5 + coalesce(p_ai_confidence, 0.6) * 0.5;
  v_base numeric;
  v_final numeric;
begin
  if p_trade_value_high is not null and p_trade_value_high > 0 then
    v_trade_value := least(100, ln(p_trade_value_high + 1) / ln(150000) * 100);
  else
    v_trade_value := v_project_size;
  end if;

  v_days_elapsed := greatest(0, extract(epoch from (now() - coalesce(p_decision_date, p_received_date, current_date))) / 86400);
  v_recency := 100 * exp(-ln(2) * v_days_elapsed / 45);

  v_stage_multiplier := case p_status
    when 'approved' then 1.15
    when 'decision_expected' then 1.0
    when 'under_consideration' then 0.9
    when 'appeal_lodged' then 0.85
    when 'validated' then 0.75
    when 'unknown' then 0.7
    when 'submitted' then 0.6
    when 'withdrawn' then 0.05
    when 'rejected' then 0.05
    else 0.7
  end;

  v_base := 0.35 * v_trade_fit + 0.25 * v_trade_value + 0.15 * v_project_size + 0.25 * v_recency;
  v_final := greatest(0, least(100, v_base * v_stage_multiplier * v_confidence_multiplier));

  return query select
    round(v_final, 2),
    case
      when v_final >= 75 then 'hot'::public.opportunity_bucket
      when v_final >= 50 then 'strong'::public.opportunity_bucket
      when v_final >= 25 then 'possible'::public.opportunity_bucket
      else 'low'::public.opportunity_bucket
    end;
end;
$$;

-- Known, accepted exceptions (documented, not silently ignored):
-- - public.spatial_ref_sys has RLS disabled: owned by the PostGIS extension
--   installer role, not this migration role, so it cannot be ALTERed here.
--   Harmless EPSG reference data, no tenant/business data.
-- - The postgis and pg_net extensions are installed in the public schema
--   rather than a dedicated schema, and PostGIS's own st_estimatedextent()
--   helper functions are consequently flagged as anon/authenticated-
--   executable. This is extremely common Supabase/PostGIS practice and
--   moving an already-installed PostGIS out of public risks breaking every
--   geography column that depends on it — not attempted retroactively for
--   marginal benefit. Both are called out explicitly in README "Security
--   model" rather than left unexplained.
