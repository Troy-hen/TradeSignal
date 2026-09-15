-- Make outreach reservations retry-safe.
-- A failed draft does not consume one of the two usable drafts for an opportunity.
-- The company/opportunity advisory lock still serialises concurrent attempts.

create or replace function public.reserve_outreach_generation(p_opportunity_id uuid)
returns table(
  generation_id uuid,
  allowed boolean,
  generation_count integer,
  remaining_generations integer,
  reason text
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_company_id uuid;
  v_generation_count integer;
  v_daily_count integer;
  v_monthly_count integer;
  v_generation_number integer;
  v_generation_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select lm.company_id
    into v_company_id
  from public.lead_matches lm
  where lm.application_trade_opportunity_id = p_opportunity_id
    and lm.company_id in (select public.auth_company_ids())
    and public.has_active_lead_match_for_opportunity(p_opportunity_id)
  order by lm.matched_at desc
  limit 1;

  if v_company_id is null then
    raise exception 'opportunity_not_found';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':' || p_opportunity_id::text, 0)
  );

  update public.ai_outreach_generations
  set status = 'failed',
      error_code = 'reservation_expired',
      completed_at = now()
  where company_id = v_company_id
    and opportunity_id = p_opportunity_id
    and status = 'reserved'
    and created_at < now() - interval '30 minutes';

  select count(*)::integer
    into v_generation_count
  from public.ai_outreach_generations
  where company_id = v_company_id
    and opportunity_id = p_opportunity_id
    and status in ('reserved', 'succeeded');

  if v_generation_count >= 2 then
    return query
      select null::uuid, false, v_generation_count, 0, 'opportunity_limit';
    return;
  end if;

  select count(*)::integer
    into v_daily_count
  from public.ai_outreach_generations
  where company_id = v_company_id
    and status in ('reserved', 'succeeded')
    and created_at >= date_trunc('day', now());

  if v_daily_count >= 20 then
    return query
      select null::uuid, false, v_generation_count, greatest(0, 2 - v_generation_count), 'daily_limit';
    return;
  end if;

  select count(*)::integer
    into v_monthly_count
  from public.ai_outreach_generations
  where company_id = v_company_id
    and status in ('reserved', 'succeeded')
    and created_at >= date_trunc('month', now());

  if v_monthly_count >= 100 then
    return query
      select null::uuid, false, v_generation_count, greatest(0, 2 - v_generation_count), 'monthly_limit';
    return;
  end if;

  -- Choose the first unused usable slot. Failed rows are recyclable, while
  -- reserved/succeeded rows remain immutable usage history.
  select slots.slot
    into v_generation_number
  from generate_series(1, 2) as slots(slot)
  where not exists (
    select 1
    from public.ai_outreach_generations aog
    where aog.company_id = v_company_id
      and aog.opportunity_id = p_opportunity_id
      and aog.generation_number = slots.slot
      and aog.status in ('reserved', 'succeeded')
  )
  order by slots.slot
  limit 1;

  select aog.id
    into v_generation_id
  from public.ai_outreach_generations aog
  where aog.company_id = v_company_id
    and aog.opportunity_id = p_opportunity_id
    and aog.generation_number = v_generation_number
    and aog.status = 'failed'
  order by aog.completed_at desc nulls last, aog.created_at desc
  limit 1;

  if v_generation_id is null then
    insert into public.ai_outreach_generations (
      company_id,
      opportunity_id,
      user_id,
      generation_number,
      status
    )
    values (
      v_company_id,
      p_opportunity_id,
      v_user_id,
      v_generation_number,
      'reserved'
    )
    returning id into v_generation_id;
  else
    update public.ai_outreach_generations
    set user_id = v_user_id,
        status = 'reserved',
        model = null,
        input_tokens = null,
        output_tokens = null,
        estimated_cost_usd = null,
        error_code = null,
        created_at = now(),
        completed_at = null
    where id = v_generation_id
      and status = 'failed';
  end if;

  return query
    select
      v_generation_id,
      true,
      v_generation_count + 1,
      greatest(0, 2 - (v_generation_count + 1)),
      null::text;
end;
$function$;

revoke execute on function public.reserve_outreach_generation(uuid) from public, anon;
grant execute on function public.reserve_outreach_generation(uuid) to authenticated;
