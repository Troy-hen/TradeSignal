-- Security pass (plan section 17). Findings from a live advisor + grant
-- audit against the connected project, in descending severity:
--
-- 1. claim_classification_batch() and upsert_planning_application() are
--    SECURITY DEFINER with no internal auth check of their own, and were
--    reachable by anon/authenticated via PostgREST. Both are meant to be
--    called only by the ingest/classify Edge Functions using the
--    service-role key. Concretely, before this fix, an unauthenticated
--    caller could flip real classification rows to 'processing' (stalling
--    the pipeline) or upsert arbitrary content into planning_applications
--    keyed by a guessed/known provider_application_id, overwriting real
--    data.
--
-- 2. browse_opportunity_teaser(uuid) was written with
--    `revoke all ... from public`, which only removes the bare PUBLIC
--    pseudo-role ACL entry — it left a separate, direct `anon=X` grant
--    (added automatically at function-creation time by Supabase's default
--    privileges for the public schema) fully intact. Anon could therefore
--    call it directly and read full teaser-tier detail (score, project
--    type, value ranges) for any opportunity id, bypassing the intended
--    "free account required" boundary from plan section 4.4.
--    browse_territory_opportunities was written with an explicit
--    `revoke ... from anon, authenticated` (naming the roles, not the
--    pseudo-role) and is unaffected.
--
-- 3. Internal helper functions used only inside RLS policy expressions
--    (auth_company_ids, is_company_member, is_company_admin,
--    has_active_lead_match, has_active_lead_match_for_opportunity,
--    is_platform_admin) and pure trigger functions (never meant to be
--    called directly at all) carry the OPPOSITE pattern from #2: a bare
--    PUBLIC ACL entry (`=X/postgres`, Postgres's own default for newly
--    created functions) with no separate direct `anon` grant. A first pass
--    at this migration revoked "from anon" only, verified live via
--    has_function_privilege(), and found it was a no-op for exactly these
--    functions — the PUBLIC entry was still granting anon access
--    regardless. None of these are independently exploitable (the helpers
--    are self-scoped to auth.uid(), and Postgres never checks EXECUTE when
--    a function fires purely as a trigger), but they have no business
--    being direct RPC surface. `authenticated` keeps EXECUTE on the
--    helpers via its own separate direct grant (untouched by revoking
--    PUBLIC) because RLS policies on companies/territory_claims/etc.
--    evaluate under the querying role's own privileges, not an elevated
--    one.
--
-- Net lesson, confirmed by testing both directions live rather than
-- assuming either: a function's EXECUTE grant can come from the bare
-- PUBLIC pseudo-role, a direct per-role grant, or both at once
-- independently — closing a function requires revoking from `public` AND
-- from the specific roles (`anon`, `authenticated`) by name, since
-- revoking one does not touch the other.

-- Cron/service-role-only: no legitimate client caller.
revoke execute on function public.claim_classification_batch(integer) from public, anon, authenticated;
revoke execute on function public.upsert_planning_application(jsonb) from public, anon, authenticated;

-- Trigger-only: Postgres never checks EXECUTE for a trigger firing normally,
-- so closing these has no effect on INSERT/UPDATE/DELETE, only on direct
-- /rest/v1/rpc/... calls that serve no purpose.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_planning_application_location() from public, anon, authenticated;
revoke execute on function public.trg_backfill_lead_matches_for_new_claim() from public, anon, authenticated;
revoke execute on function public.trg_create_pending_classification() from public, anon, authenticated;
revoke execute on function public.trg_fanout_lead_matches() from public, anon, authenticated;
revoke execute on function public.trg_log_application_status_change() from public, anon, authenticated;
revoke execute on function public.trg_notify_territory_waitlist() from public, anon, authenticated;
revoke execute on function public.trg_rescore_on_application_change() from public, anon, authenticated;
revoke execute on function public.trg_rescore_on_classification_change() from public, anon, authenticated;
revoke execute on function public.trg_score_application_trade_opportunity() from public, anon, authenticated;

-- RLS-policy helpers: not public API surface, but authenticated must keep
-- EXECUTE (via its own direct grant, unaffected by revoking PUBLIC) since
-- policies on companies/territory_claims/lead_matches/etc. run under the
-- querying (authenticated) role, not an elevated one.
revoke execute on function public.auth_company_ids() from public, anon;
revoke execute on function public.is_company_member(uuid) from public, anon;
revoke execute on function public.is_company_admin(uuid) from public, anon;
revoke execute on function public.has_active_lead_match(uuid) from public, anon;
revoke execute on function public.has_active_lead_match_for_opportunity(uuid) from public, anon;
revoke execute on function public.is_platform_admin() from public, anon;

-- Free-tier (signed-up, no claim) surface: authenticated only, matching
-- browse_territory_opportunities' existing correct grant.
revoke execute on function public.browse_opportunity_teaser(uuid) from public, anon;

-- Has its own is_company_admin() check, but there's no reason for anon to
-- reach it at all.
revoke execute on function public.upsert_company_notification_preferences(uuid, boolean, text, numeric, numeric, boolean) from public, anon;

-- spatial_ref_sys is a PostGIS system table of coordinate-system
-- definitions (SRID -> projection metadata) — no tenant data, but the
-- database linter flags any public-schema table without RLS enabled.
-- NOT fixed here: the table is owned by the extension itself
-- (`must be owner of table spatial_ref_sys` when attempted), not by any
-- role a migration runs as. This is a well-known, common PostGIS artifact
-- across virtually all Supabase projects, contains zero tenant data (just
-- public SRID/projection reference constants), and is left as an accepted
-- default rather than requiring superuser/extension-owner access to change.
--
-- pg_net and postgis are both flagged by the linter for living in the
-- public schema (WARN, not ERROR). Neither is moved here:
--   - pg_net's control file marks it non-relocatable
--     (`ALTER EXTENSION "pg_net" SET SCHEMA` fails with
--     "extension does not support SET SCHEMA" — confirmed live against
--     this project). Moving it would require DROP/CREATE EXTENSION, which
--     risks breaking the pg_cron jobs that call net.http_post/net.http_get
--     mid-flight — not worth the risk for a cosmetic lint fix. Its actual
--     callable functions already live in their own dedicated `net` schema
--     regardless of where the extension is registered.
--   - postgis is relocatable in principle, but Supabase provisions every
--     new project with it in public by default, and this project already
--     has geography(Point,4326) columns (planning_applications.location,
--     postcode_districts.centroid) depending on it — moving it this late
--     touches ~1000 dependent objects for no functional benefit.
-- Both are left as accepted, documented defaults.
