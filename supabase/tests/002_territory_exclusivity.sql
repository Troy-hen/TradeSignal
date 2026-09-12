-- Territory exclusivity + reservation expiry (plan section 19:
-- "Territory exclusivity race", "Expired reservations").
--
-- Exercises the real reserve_territory() RPC end-to-end as two different
-- authenticated users (via SET LOCAL request.jwt.claims — see
-- 001_rls_and_access_control.sql for why this is the right technique
-- here), not just the underlying partial unique index directly — this is
-- what actually proves the whole path (RPC -> company resolution ->
-- insert -> unique_violation -> typed error) behaves correctly, not only
-- the constraint in isolation.
--
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 002_territory_exclusivity.sql

do $$
declare
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_company_a uuid;
  v_company_b uuid;
  v_trade_id uuid;
  v_claim_a public.territory_claims;
  v_second_reservation_blocked boolean := false;
  v_territory_id uuid;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  values
    (v_user_a, 'zzz_test_excl_a@example.invalid', 'x', now(), now(), now(), 'authenticated', 'authenticated'),
    (v_user_b, 'zzz_test_excl_b@example.invalid', 'x', now(), now(), now(), 'authenticated', 'authenticated');

  insert into public.companies (trading_name, billing_email) values ('ZZZ Test Excl A', 'a@example.invalid') returning id into v_company_a;
  insert into public.companies (trading_name, billing_email) values ('ZZZ Test Excl B', 'b@example.invalid') returning id into v_company_b;

  insert into public.company_memberships (company_id, user_id, role, status, joined_at)
  values (v_company_a, v_user_a, 'owner', 'active', now()), (v_company_b, v_user_b, 'owner', 'active', now());

  select id into v_trade_id from public.trade_categories where slug = 'groundworks';

  -- User A reserves NR15 x groundworks — a district unlikely to already
  -- have a live claim from real seed/demo data, kept distinct from the
  -- district 001_rls_and_access_control.sql uses (B1) so the two test
  -- files never contend for the same territories row.
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into v_claim_a from public.reserve_territory('NR15', v_trade_id);
  reset role;

  if v_claim_a.status <> 'reserved' or v_claim_a.reserved_expires_at is null then
    raise exception 'FAIL: reserve_territory did not return a reserved claim with an expiry (got status=%)', v_claim_a.status;
  end if;

  -- User B races for the same district+trade — must be blocked, not
  -- silently succeed as a second holder of the same exclusive territory.
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_b::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.reserve_territory('NR15', v_trade_id);
  exception when others then
    if sqlerrm = 'territory_unavailable' then
      v_second_reservation_blocked := true;
    else
      raise;
    end if;
  end;
  reset role;

  if not v_second_reservation_blocked then
    raise exception 'FAIL: a second company was able to reserve an already-reserved territory';
  end if;

  -- Expire A's reservation (same predicate as the pg_cron sweep job:
  -- expire-territory-reservations) and confirm B can now claim it.
  update public.territory_claims set status = 'expired', updated_at = now()
  where id = v_claim_a.id and status = 'reserved' and reserved_expires_at is not null;

  perform set_config('request.jwt.claims', json_build_object('sub', v_user_b::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.reserve_territory('NR15', v_trade_id);
  reset role;

  if not exists (
    select 1 from public.territory_claims where company_id = v_company_b and status = 'reserved'
      and territory_id = (select id from public.territories where postcode_district = 'NR15' and trade_category_id = v_trade_id)
  ) then
    raise exception 'FAIL: company B could not reserve NR15/groundworks after A''s reservation expired';
  end if;

  select id into v_territory_id from public.territories where postcode_district = 'NR15' and trade_category_id = v_trade_id;

  delete from public.territory_claims where territory_id = v_territory_id and company_id in (v_company_a, v_company_b);
  delete from public.territories where id = v_territory_id;
  delete from public.company_memberships where company_id in (v_company_a, v_company_b);
  delete from public.companies where id in (v_company_a, v_company_b);
  delete from public.profiles where id in (v_user_a, v_user_b);
  delete from auth.users where id in (v_user_a, v_user_b);

  raise notice 'PASS: territory exclusivity race + reservation expiry sweep';
end $$;
