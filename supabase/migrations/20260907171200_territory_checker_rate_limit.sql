-- check_territory_availability is GRANTed directly to anon (it IS the
-- public territory checker), reachable via PostgREST regardless of
-- whichever Next.js route happens to call it — so rate limiting only in
-- the API route would protect nothing against a direct RPC call. This adds
-- the portable secondary layer described in the plan (Cloudflare's edge
-- binding is the primary layer, configured separately in the dashboard;
-- this is what protects local dev and any caller that bypasses the edge).
--
-- Volatility changes from stable to volatile: it now writes to
-- rate_limit_events, so it's no longer side-effect-free within a
-- statement — leaving it marked stable after adding a write would
-- mislabel it to the planner.
create or replace function public.check_territory_availability(p_postcode_district text, p_trade_slug text)
returns table (
  applications_last_30d int,
  high_priority_count int,
  estimated_construction_activity_gbp numeric,
  estimated_trade_value_gbp numeric,
  territory_status text,
  monthly_price_pence int
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_district text := upper(trim(p_postcode_district));
  v_trade_id uuid;
  v_raw_ip text;
  v_identifier text;
  v_recent_count int;
begin
  -- Best-effort IP extraction from the PostgREST request context; falls
  -- back to a shared bucket (still rate-limited, just coarser) rather than
  -- erroring when called outside a REST request (e.g. direct SQL/testing).
  begin
    v_raw_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'unknown'), ',', 1);
  exception when others then
    v_raw_ip := 'unknown';
  end;
  -- pgcrypto's digest() lives in the extensions schema, not public — fully
  -- qualified rather than widening this function's search_path.
  v_identifier := encode(extensions.digest(trim(v_raw_ip) || 'tradesignal_rate_limit_salt_v1', 'sha256'), 'hex');

  select count(*) into v_recent_count
  from public.rate_limit_events
  where scope = 'public_territory_checker'
    and identifier = v_identifier
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 20 then
    raise exception 'rate_limited';
  end if;

  insert into public.rate_limit_events (scope, identifier) values ('public_territory_checker', v_identifier);

  select id into v_trade_id from public.trade_categories where slug = p_trade_slug and is_active;
  if v_trade_id is null then
    raise exception 'unknown_trade';
  end if;

  return query
  select
    count(*) filter (where pa.received_date >= current_date - interval '30 days')::int,
    count(*) filter (where ato.opportunity_bucket = 'hot')::int,
    coalesce(sum(ac.estimated_total_project_value_high) filter (where pa.received_date >= current_date - interval '30 days'), 0),
    coalesce(sum(ato.estimated_trade_value_high) filter (where pa.received_date >= current_date - interval '30 days'), 0),
    coalesce(
      (select tc.status::text from public.territory_claims tc
       join public.territories t on t.id = tc.territory_id
       where t.postcode_district = v_district and t.trade_category_id = v_trade_id
         and tc.status in ('reserved', 'active', 'suspended')
       limit 1),
      'available'
    ),
    coalesce(
      (select t.monthly_price_pence from public.territories t
       where t.postcode_district = v_district and t.trade_category_id = v_trade_id),
      (select default_monthly_price_pence from public.trade_categories where id = v_trade_id)
    )
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.application_classifications ac on ac.id = ato.application_classification_id
  where ato.postcode_district = v_district and ato.trade_category_id = v_trade_id and ato.is_active;
end;
$$;
revoke all on function public.check_territory_availability(text, text) from public;
grant execute on function public.check_territory_availability(text, text) to anon, authenticated;
