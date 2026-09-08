-- RLS tenant isolation + anon zero-access + admin grant audit trail
-- (plan section 19: "RLS tenant isolation", "Unauthenticated access").
--
-- Each block is a single DO $$ ... $$ statement, which Postgres runs as
-- one implicit transaction: a RAISE EXCEPTION on a failed assertion rolls
-- back everything the block did, including its own fixture inserts, so
-- there is nothing to clean up on failure. On success, the block's own
-- explicit DELETEs at the end net every fixture back out to zero rows.
--
-- `set local request.jwt.claims`/`set local role` simulate a real
-- authenticated PostgREST request for the scope of one transaction —
-- the standard way to exercise RLS policies and auth.uid()-dependent
-- SECURITY DEFINER functions from plain SQL, since execute_sql itself
-- runs as a superuser role that bypasses RLS entirely.
--
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 001_rls_and_access_control.sql

-- Test 1-2: two companies, RLS blocks cross-tenant reads on companies and
-- territory_claims even when the querying user knows the other row's id.
do $$
declare
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_company_a uuid;
  v_company_b uuid;
  v_seen_company_ids uuid[];
  v_district text;
  v_trade_id uuid;
  v_territory_id uuid;
  v_claim_b uuid;
  v_seen_claims int;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  values
    (v_user_a, 'zzz_test_rls_a@example.invalid', 'x', now(), now(), now(), 'authenticated', 'authenticated'),
    (v_user_b, 'zzz_test_rls_b@example.invalid', 'x', now(), now(), now(), 'authenticated', 'authenticated');

  insert into public.companies (trading_name, billing_email) values ('ZZZ Test Co A', 'a@example.invalid') returning id into v_company_a;
  insert into public.companies (trading_name, billing_email) values ('ZZZ Test Co B', 'b@example.invalid') returning id into v_company_b;

  insert into public.company_memberships (company_id, user_id, role, status, joined_at)
  values (v_company_a, v_user_a, 'owner', 'active', now()), (v_company_b, v_user_b, 'owner', 'active', now());

  select id into v_trade_id from public.trade_categories where slug = 'roofing';
  select id into v_district from public.postcode_districts where id = 'B1';

  insert into public.territories (postcode_district, trade_category_id, monthly_price_pence)
  values (v_district, v_trade_id, 9900)
  on conflict (postcode_district, trade_category_id) do update set monthly_price_pence = excluded.monthly_price_pence
  returning id into v_territory_id;

  insert into public.territory_claims (territory_id, company_id, status, created_by)
  values (v_territory_id, v_company_b, 'active', v_user_b)
  returning id into v_claim_b;

  -- As user A: companies query must see only A's own company.
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select array_agg(id) into v_seen_company_ids from public.companies;
  if v_seen_company_ids is null or v_company_a <> all(v_seen_company_ids) then
    raise exception 'FAIL: user A cannot see their own company via RLS';
  end if;
  if v_company_b = any(v_seen_company_ids) then
    raise exception 'FAIL: RLS leak — user A can see company B via companies SELECT';
  end if;

  -- As user A: territory_claims query must not return B's claim, even
  -- when B's claim id is known directly.
  select count(*) into v_seen_claims from public.territory_claims where id = v_claim_b;
  if v_seen_claims <> 0 then
    raise exception 'FAIL: RLS leak — user A can see company B''s territory_claims row by id';
  end if;

  reset role;

  -- Cleanup (also runs on the success path above; a failure rolls back
  -- the whole DO block automatically, taking these inserts with it).
  delete from public.territory_claims where id = v_claim_b;
  delete from public.territories where id = v_territory_id and postcode_district = v_district and trade_category_id = v_trade_id
    and not exists (select 1 from public.territory_claims where territory_id = v_territory_id);
  delete from public.company_memberships where company_id in (v_company_a, v_company_b);
  delete from public.companies where id in (v_company_a, v_company_b);
  delete from public.profiles where id in (v_user_a, v_user_b);
  delete from auth.users where id in (v_user_a, v_user_b);

  raise notice 'PASS: RLS tenant isolation (companies, territory_claims)';
end $$;

-- Test 3: anon has no table-level grant at all on tenant/planning data —
-- a direct SELECT must fail with insufficient_privilege (42501), not
-- silently return zero rows (which would only prove RLS, not the
-- underlying grant is actually absent).
do $$
declare
  v_failed_as_expected boolean := false;
begin
  set local role anon;
  begin
    perform 1 from public.companies limit 1;
  exception when insufficient_privilege then
    v_failed_as_expected := true;
  end;
  reset role;

  if not v_failed_as_expected then
    raise exception 'FAIL: anon role has a table-level grant on public.companies (should have none)';
  end if;

  v_failed_as_expected := false;
  set local role anon;
  begin
    perform 1 from public.planning_applications limit 1;
  exception when insufficient_privilege then
    v_failed_as_expected := true;
  end;
  reset role;

  if not v_failed_as_expected then
    raise exception 'FAIL: anon role has a table-level grant on public.planning_applications (should have none)';
  end if;

  raise notice 'PASS: anon has zero table-level access to companies/planning_applications';
end $$;

-- Test 4: admin_users grant/revoke is audited via trigger regardless of
-- how the row got there (there is no in-app grant mechanism at all).
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_audit_count int;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  values (v_user_id, 'zzz_test_admin_trigger@example.invalid', 'x', now(), now(), now(), 'authenticated', 'authenticated');

  insert into public.admin_users (profile_id, notes) values (v_user_id, 'zzz_test_trigger_check');

  select count(*) into v_audit_count from public.audit_logs where action = 'admin.role_granted' and entity_id = v_user_id;
  if v_audit_count <> 1 then
    raise exception 'FAIL: expected 1 admin.role_granted audit_logs row, got %', v_audit_count;
  end if;

  delete from public.admin_users where profile_id = v_user_id;

  select count(*) into v_audit_count from public.audit_logs where action = 'admin.role_revoked' and entity_id = v_user_id;
  if v_audit_count <> 1 then
    raise exception 'FAIL: expected 1 admin.role_revoked audit_logs row, got %', v_audit_count;
  end if;

  delete from public.audit_logs where entity_id = v_user_id;
  delete from public.profiles where id = v_user_id;
  delete from auth.users where id = v_user_id;

  raise notice 'PASS: admin_users grant/revoke audit trigger';
end $$;
