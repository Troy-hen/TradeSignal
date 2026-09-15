-- Planning record dedup + classification queue (plan section 19:
-- "Planning record dedup", part of "AI classification failure" — the
-- part that's testable without a real LLM call, i.e. the queue-claiming
-- mechanics classify-planning-application relies on).
--
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 003_planning_ingestion_and_classification.sql

do $$
declare
  v_provider_id text := 'zzz_test_' || gen_random_uuid()::text;
  v_result record;
  v_app_id uuid;
  v_classification_status public.classification_status;
  v_batch record;
  v_batch_count int := 0;
begin
  -- First ingest: brand new application, must create both the
  -- planning_applications row and a 'pending' application_classifications
  -- row (via trg_create_pending_classification).
  select * into v_result from public.upsert_planning_application(jsonb_build_object(
    'provider', 'mock',
    'provider_application_id', v_provider_id,
    'local_planning_authority', 'Zzz Test Council',
    'planning_reference', '26/ZZZ01/FUL',
    'postcode', 'B1 1AA',
    'application_type', 'Householder',
    'proposal_description', 'Test fixture: single-storey rear extension',
    'status', 'submitted',
    'received_date', current_date::text,
    'content_hash', 'hash_v1'
  ));

  if not v_result.is_new or v_result.is_changed then
    raise exception 'FAIL: first upsert should be is_new=true, is_changed=false (got is_new=%, is_changed=%)', v_result.is_new, v_result.is_changed;
  end if;
  v_app_id := v_result.id;

  select classification_status into v_classification_status
  from public.application_classifications where planning_application_id = v_app_id;
  if v_classification_status <> 'pending' then
    raise exception 'FAIL: new application should auto-create a pending classification row (got %)', v_classification_status;
  end if;

  -- Second ingest: identical content_hash — must dedup (no is_new, no
  -- is_changed), classification must stay untouched at 'pending'.
  select * into v_result from public.upsert_planning_application(jsonb_build_object(
    'provider', 'mock',
    'provider_application_id', v_provider_id,
    'local_planning_authority', 'Zzz Test Council',
    'planning_reference', '26/ZZZ01/FUL',
    'postcode', 'B1 1AA',
    'application_type', 'Householder',
    'proposal_description', 'Test fixture: single-storey rear extension',
    'status', 'submitted',
    'received_date', current_date::text,
    'content_hash', 'hash_v1'
  ));

  if v_result.is_new or v_result.is_changed then
    raise exception 'FAIL: identical re-ingest should dedup as is_new=false, is_changed=false (got is_new=%, is_changed=%)', v_result.is_new, v_result.is_changed;
  end if;

  -- Third ingest: same provider_application_id, different content_hash —
  -- must flag is_changed and flip the classification row to 'stale' so
  -- it gets reprocessed, without touching its existing row identity.
  select * into v_result from public.upsert_planning_application(jsonb_build_object(
    'provider', 'mock',
    'provider_application_id', v_provider_id,
    'local_planning_authority', 'Zzz Test Council',
    'planning_reference', '26/ZZZ01/FUL',
    'postcode', 'B1 1AA',
    'application_type', 'Householder',
    'proposal_description', 'Test fixture: single-storey rear extension, revised to two-storey',
    'status', 'validated',
    'received_date', current_date::text,
    'content_hash', 'hash_v2'
  ));

  if v_result.is_new or not v_result.is_changed or v_result.id <> v_app_id then
    raise exception 'FAIL: changed content should dedup to the same row id (%) with is_changed=true (got id=%, is_new=%, is_changed=%)',
      v_app_id, v_result.id, v_result.is_new, v_result.is_changed;
  end if;

  select classification_status into v_classification_status
  from public.application_classifications where planning_application_id = v_app_id;
  if v_classification_status <> 'stale' then
    raise exception 'FAIL: a changed application should flip its classification to stale (got %)', v_classification_status;
  end if;

  -- claim_classification_batch() is the actual queue-claiming mechanism
  -- classify-planning-application's cron run depends on: it must pick up
  -- this stale row and flip it to 'processing' via FOR UPDATE SKIP LOCKED.
  for v_batch in select * from public.claim_classification_batch(50) loop
    if v_batch.planning_application_id = v_app_id then
      v_batch_count := v_batch_count + 1;
      if v_batch.previous_status <> 'stale' then
        raise exception 'FAIL: claim_classification_batch reported previous_status=% for our stale row, expected stale', v_batch.previous_status;
      end if;
    end if;
  end loop;

  if v_batch_count <> 1 then
    raise exception 'FAIL: expected claim_classification_batch to claim our test row exactly once, got % times', v_batch_count;
  end if;

  select classification_status into v_classification_status
  from public.application_classifications where planning_application_id = v_app_id;
  if v_classification_status <> 'processing' then
    raise exception 'FAIL: claimed row should be status=processing (got %)', v_classification_status;
  end if;

  delete from public.application_classifications where planning_application_id = v_app_id;
  delete from public.planning_applications where id = v_app_id;

  raise notice 'PASS: planning ingestion dedup, content-hash change detection, classification queue claiming';
end $$;
