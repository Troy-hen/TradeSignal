-- Backs the ingest-planning-applications Edge Function. A single
-- round-trip, conditional upsert: content_hash unchanged -> just bump
-- last_seen_at; content_hash changed -> update the row AND flip the
-- existing classification to 'stale' so Task 8's classifier picks it back
-- up. Service-role only (called from the Edge Function's admin client).

create or replace function public.upsert_planning_application(p_application jsonb)
returns table (id uuid, is_new boolean, is_changed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_is_new boolean := false;
  v_is_changed boolean := false;
  v_existing_hash text;
begin
  select pa.id, pa.content_hash into v_id, v_existing_hash
  from public.planning_applications pa
  where pa.provider = p_application->>'provider'
    and pa.provider_application_id = p_application->>'provider_application_id';

  if v_id is null then
    insert into public.planning_applications (
      provider, provider_application_id, local_planning_authority, local_planning_authority_code,
      planning_reference, address_text, postcode, latitude, longitude, application_type,
      proposal_description, status, status_raw, decision_outcome_raw, received_date, validated_date,
      decision_due_date, decision_date, appeal_status, dwelling_count, is_commercial, floorspace_sqm,
      applicant_name, agent_company, estimated_value_gbp, source_url, raw_provider_payload,
      content_hash, provider_changed_at
    ) values (
      p_application->>'provider', p_application->>'provider_application_id',
      p_application->>'local_planning_authority', p_application->>'local_planning_authority_code',
      p_application->>'planning_reference', p_application->>'address_text', p_application->>'postcode',
      (p_application->>'latitude')::double precision, (p_application->>'longitude')::double precision,
      p_application->>'application_type', p_application->>'proposal_description',
      (p_application->>'status')::planning_application_status, p_application->>'status_raw',
      p_application->>'decision_outcome_raw', (p_application->>'received_date')::date,
      (p_application->>'validated_date')::date, (p_application->>'decision_due_date')::date,
      (p_application->>'decision_date')::date, p_application->>'appeal_status',
      (p_application->>'dwelling_count')::int, (p_application->>'is_commercial')::boolean,
      (p_application->>'floorspace_sqm')::numeric, p_application->>'applicant_name',
      p_application->>'agent_company', (p_application->>'estimated_value_gbp')::numeric,
      p_application->>'source_url', p_application->'raw_provider_payload',
      p_application->>'content_hash', (p_application->>'provider_changed_at')::timestamptz
    )
    returning public.planning_applications.id into v_id;

    v_is_new := true;
  else
    v_is_changed := v_existing_hash is distinct from (p_application->>'content_hash');

    update public.planning_applications set
      local_planning_authority = p_application->>'local_planning_authority',
      local_planning_authority_code = p_application->>'local_planning_authority_code',
      planning_reference = p_application->>'planning_reference',
      address_text = p_application->>'address_text',
      postcode = p_application->>'postcode',
      latitude = (p_application->>'latitude')::double precision,
      longitude = (p_application->>'longitude')::double precision,
      application_type = p_application->>'application_type',
      proposal_description = p_application->>'proposal_description',
      status = (p_application->>'status')::planning_application_status,
      status_raw = p_application->>'status_raw',
      decision_outcome_raw = p_application->>'decision_outcome_raw',
      received_date = (p_application->>'received_date')::date,
      validated_date = (p_application->>'validated_date')::date,
      decision_due_date = (p_application->>'decision_due_date')::date,
      decision_date = (p_application->>'decision_date')::date,
      appeal_status = p_application->>'appeal_status',
      dwelling_count = (p_application->>'dwelling_count')::int,
      is_commercial = (p_application->>'is_commercial')::boolean,
      floorspace_sqm = (p_application->>'floorspace_sqm')::numeric,
      applicant_name = p_application->>'applicant_name',
      agent_company = p_application->>'agent_company',
      estimated_value_gbp = (p_application->>'estimated_value_gbp')::numeric,
      source_url = p_application->>'source_url',
      raw_provider_payload = p_application->'raw_provider_payload',
      content_hash = p_application->>'content_hash',
      provider_changed_at = (p_application->>'provider_changed_at')::timestamptz,
      last_seen_at = now()
    where public.planning_applications.id = v_id;

    if v_is_changed then
      update public.application_classifications
      set classification_status = 'stale'
      where planning_application_id = v_id;
    end if;
  end if;

  return query select v_id, v_is_new, v_is_changed;
end;
$$;
revoke all on function public.upsert_planning_application(jsonb) from public;

-- Guarantees a pending classification row exists the moment a planning
-- application row does, regardless of which code path inserted it — ingestion
-- durably hands off to the classifier even if AI classification never
-- succeeds (or hasn't run yet).
create or replace function public.trg_create_pending_classification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.application_classifications (planning_application_id, classification_status)
  values (new.id, 'pending')
  on conflict (planning_application_id) do nothing;
  return new;
end;
$$;

create trigger trg_create_pending_classification_on_insert
  after insert on public.planning_applications
  for each row
  execute function public.trg_create_pending_classification();
