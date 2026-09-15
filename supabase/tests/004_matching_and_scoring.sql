-- Trade matching fan-out (both directions) + opportunity scoring (plan
-- section 19: "Trade matching", part of the score/bucket behaviour behind
-- "High-priority alerts").
--
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 004_matching_and_scoring.sql

-- Part 1: matching fan-out. Sequenced so both directions get exercised
-- against the same claim: an opportunity created before any claim exists
-- must NOT match; activating a claim must then backfill it (reverse
-- trigger); a second, later opportunity for the same district+trade must
-- match immediately on insert (forward trigger).
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_company_id uuid;
  v_trade_id uuid;
  v_district text := 'B29';
  v_territory_id uuid;
  v_claim_id uuid;
  v_app1_id uuid;
  v_classification1_id uuid;
  v_opp1_id uuid;
  v_app2_id uuid;
  v_classification2_id uuid;
  v_opp2_id uuid;
  v_match_count int;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  values (v_user_id, 'zzz_test_matching@example.invalid', 'x', now(), now(), now(), 'authenticated', 'authenticated');
  insert into public.companies (trading_name, billing_email) values ('ZZZ Test Matching Co', 'm@example.invalid') returning id into v_company_id;
  insert into public.company_memberships (company_id, user_id, role, status, joined_at) values (v_company_id, v_user_id, 'owner', 'active', now());

  select id into v_trade_id from public.trade_categories where slug = 'plumbing-heating';

  -- Opportunity #1, created before any claim exists for B29/plumbing-heating.
  -- trg_create_pending_classification already auto-creates a 'pending'
  -- application_classifications row on the planning_applications insert
  -- (application_classifications.planning_application_id is unique), so
  -- this updates that row rather than inserting a second one.
  insert into public.planning_applications (provider, provider_application_id, planning_reference, postcode, status, received_date, content_hash)
  values ('mock', 'zzz_test_match_1_' || gen_random_uuid()::text, '26/ZZZM1/FUL', 'B29 6AA', 'submitted', current_date, 'zzz_hash_1')
  returning id into v_app1_id;
  update public.application_classifications set classification_status = 'completed'
  where planning_application_id = v_app1_id returning id into v_classification1_id;
  insert into public.application_trade_opportunities (planning_application_id, application_classification_id, trade_category_id, fit_score, postcode_district)
  values (v_app1_id, v_classification1_id, v_trade_id, 70, v_district)
  returning id into v_opp1_id;

  select count(*) into v_match_count from public.lead_matches where application_trade_opportunity_id = v_opp1_id;
  if v_match_count <> 0 then
    raise exception 'FAIL: opportunity #1 should have zero matches before any active claim exists (got %)', v_match_count;
  end if;

  -- Reserve then activate a claim for B29/plumbing-heating (mirrors the
  -- real reserved -> active transition the Stripe webhook performs) —
  -- this is what should trigger the reverse backfill for opportunity #1.
  insert into public.territories (postcode_district, trade_category_id, monthly_price_pence)
  values (v_district, v_trade_id, 9900)
  on conflict (postcode_district, trade_category_id) do update set monthly_price_pence = excluded.monthly_price_pence
  returning id into v_territory_id;
  insert into public.territory_claims (territory_id, company_id, status, created_by)
  values (v_territory_id, v_company_id, 'reserved', v_user_id)
  returning id into v_claim_id;
  update public.territory_claims set status = 'active', activated_at = now() where id = v_claim_id;

  select count(*) into v_match_count from public.lead_matches where application_trade_opportunity_id = v_opp1_id and company_id = v_company_id;
  if v_match_count <> 1 then
    raise exception 'FAIL: reverse trigger should backfill exactly 1 lead_matches row for opportunity #1 once the claim activates (got %)', v_match_count;
  end if;

  -- Opportunity #2, created after the claim is already active — must
  -- match immediately via the forward trigger, no backfill needed.
  insert into public.planning_applications (provider, provider_application_id, planning_reference, postcode, status, received_date, content_hash)
  values ('mock', 'zzz_test_match_2_' || gen_random_uuid()::text, '26/ZZZM2/FUL', 'B29 6BB', 'submitted', current_date, 'zzz_hash_2')
  returning id into v_app2_id;
  update public.application_classifications set classification_status = 'completed'
  where planning_application_id = v_app2_id returning id into v_classification2_id;
  insert into public.application_trade_opportunities (planning_application_id, application_classification_id, trade_category_id, fit_score, postcode_district)
  values (v_app2_id, v_classification2_id, v_trade_id, 65, v_district)
  returning id into v_opp2_id;

  select count(*) into v_match_count from public.lead_matches where application_trade_opportunity_id = v_opp2_id and company_id = v_company_id;
  if v_match_count <> 1 then
    raise exception 'FAIL: forward trigger should create exactly 1 lead_matches row immediately for opportunity #2 (got %)', v_match_count;
  end if;

  delete from public.lead_matches where application_trade_opportunity_id in (v_opp1_id, v_opp2_id);
  delete from public.application_trade_opportunities where id in (v_opp1_id, v_opp2_id);
  delete from public.application_classifications where id in (v_classification1_id, v_classification2_id);
  delete from public.planning_applications where id in (v_app1_id, v_app2_id);
  delete from public.territory_claims where id = v_claim_id;
  delete from public.territories where id = v_territory_id;
  delete from public.company_memberships where company_id = v_company_id;
  delete from public.companies where id = v_company_id;
  delete from public.profiles where id = v_user_id;
  delete from auth.users where id = v_user_id;

  raise notice 'PASS: matching fan-out (reverse backfill on claim activation, forward match on new opportunity)';
end $$;

-- Part 2: scoring qualitative correctness. Deliberately avoids asserting
-- an exact numeric score (the formula's precise log/decay math isn't
-- worth reproducing bit-for-bit in a test and re-coupling both to the
-- same possible mistake) — instead asserts the two properties that
-- actually matter and are robust to any reasonable reading of the
-- formula: a strong, freshly-approved application clears the HOT bucket
-- threshold, and the same strong application crushed by a rejected
-- status lands in LOW and is deactivated, proving the stage multiplier
-- dominates rather than just shaving points off.
do $$
declare
  v_app_id uuid;
  v_classification_id uuid;
  v_opp_id uuid;
  v_trade_id uuid;
  v_score numeric;
  v_bucket public.opportunity_bucket;
  v_is_active boolean;
begin
  select id into v_trade_id from public.trade_categories where slug = 'electrical';

  -- Strong, freshly-approved case: should land in HOT (>= 75).
  insert into public.planning_applications (provider, provider_application_id, planning_reference, postcode, status, received_date, decision_date, content_hash)
  values ('mock', 'zzz_test_score_hot_' || gen_random_uuid()::text, '26/ZZZS1/FUL', 'BA1 1AA', 'approved', current_date - 10, current_date, 'zzz_hash_hot')
  returning id into v_app_id;
  update public.application_classifications set classification_status = 'completed', project_size_category = 'large', ai_confidence = 0.9
  where planning_application_id = v_app_id returning id into v_classification_id;
  insert into public.application_trade_opportunities
    (planning_application_id, application_classification_id, trade_category_id, fit_score, estimated_trade_value_low, estimated_trade_value_high, ai_confidence, postcode_district)
  values (v_app_id, v_classification_id, v_trade_id, 95, 80000, 120000, 0.9, 'BA1')
  returning id, opportunity_score, opportunity_bucket, is_active into v_opp_id, v_score, v_bucket, v_is_active;

  if v_score < 75 or v_bucket <> 'hot' or not v_is_active then
    raise exception 'FAIL: strong approved application should score HOT (>=75) and stay active — got score=%, bucket=%, is_active=%', v_score, v_bucket, v_is_active;
  end if;

  delete from public.application_trade_opportunities where id = v_opp_id;
  delete from public.application_classifications where id = v_classification_id;
  delete from public.planning_applications where id = v_app_id;

  -- Same strong inputs, but rejected: the stage multiplier (0.05) should
  -- crush the score to LOW (<25) and flip is_active to false, not just
  -- knock a few points off a HOT-range score.
  insert into public.planning_applications (provider, provider_application_id, planning_reference, postcode, status, received_date, decision_date, content_hash)
  values ('mock', 'zzz_test_score_low_' || gen_random_uuid()::text, '26/ZZZS2/FUL', 'BA1 1AA', 'rejected', current_date - 10, current_date, 'zzz_hash_low')
  returning id into v_app_id;
  update public.application_classifications set classification_status = 'completed', project_size_category = 'large', ai_confidence = 0.9
  where planning_application_id = v_app_id returning id into v_classification_id;
  insert into public.application_trade_opportunities
    (planning_application_id, application_classification_id, trade_category_id, fit_score, estimated_trade_value_low, estimated_trade_value_high, ai_confidence, postcode_district)
  values (v_app_id, v_classification_id, v_trade_id, 95, 80000, 120000, 0.9, 'BA1')
  returning id, opportunity_score, opportunity_bucket, is_active into v_opp_id, v_score, v_bucket, v_is_active;

  if v_score >= 25 or v_bucket <> 'low' or v_is_active then
    raise exception 'FAIL: rejected application should be crushed to LOW (<25) and deactivated — got score=%, bucket=%, is_active=%', v_score, v_bucket, v_is_active;
  end if;

  delete from public.application_trade_opportunities where id = v_opp_id;
  delete from public.application_classifications where id = v_classification_id;
  delete from public.planning_applications where id = v_app_id;

  raise notice 'PASS: opportunity scoring (HOT bucket achievable, rejected status crushes score and deactivates)';
end $$;
