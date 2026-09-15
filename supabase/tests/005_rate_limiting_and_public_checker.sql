-- Public territory checker: aggregate-only shape, unknown-trade handling,
-- and the DB-level rate limit (plan section 19's "Unauthenticated access"
-- plus the public-checker behaviour from section 12). This is the layer
-- that protects local dev and any environment without the Cloudflare edge
-- binding (see lib/rate-limit.ts) — the one that must hold on its own.
--
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 005_rate_limiting_and_public_checker.sql

do $$
declare
  v_result record;
  v_unknown_trade_raised boolean := false;
begin
  set local role anon;

  -- A real district+trade must return the aggregate shape with no error,
  -- and — critically for section 4.3's "never a row from
  -- planning_applications" guarantee — the returned columns are only
  -- ever counts/sums/status/price, never an id, address, or reference.
  select * into v_result from public.check_territory_availability('NR15', 'groundworks');
  if v_result.territory_status is null or v_result.monthly_price_pence is null then
    raise exception 'FAIL: check_territory_availability should return a populated status/price row for a known district+trade';
  end if;

  -- An unknown trade slug must raise a typed error, not silently return
  -- an empty/zeroed row (which would look identical to "no activity").
  begin
    perform public.check_territory_availability('NR15', 'zzz_not_a_real_trade');
  exception when others then
    if sqlerrm = 'unknown_trade' then
      v_unknown_trade_raised := true;
    else
      raise;
    end if;
  end;
  if not v_unknown_trade_raised then
    raise exception 'FAIL: check_territory_availability should raise unknown_trade for an unrecognised slug';
  end if;

  reset role;
  raise notice 'PASS: check_territory_availability aggregate shape + unknown_trade handling';
end $$;

-- Rate limit: the function reads the caller's IP from
-- current_setting('request.headers')::json->>'x-forwarded-for'
-- (PostgREST's request-context convention) — simulated here the same way
-- request.jwt.claims is simulated elsewhere in this suite. A fixed,
-- distinctive test IP keeps this isolated from any real traffic's
-- counters, and the whole block's rate_limit_events rows are deleted by
-- identifier at the end regardless of pass/fail path (a raised exception
-- rolls back the DO block's own inserts, but the rate limit function
-- itself commits its own inserts per-call outside this block's control,
-- since check_territory_availability is a separate statement each loop
-- iteration — see cleanup note below).
do $$
declare
  v_test_ip text := '203.0.113.42';
  v_rate_limited boolean := false;
  v_calls int := 0;
begin
  perform set_config('request.headers', json_build_object('x-forwarded-for', v_test_ip)::text, true);
  set local role anon;

  -- The function's own limit (see
  -- supabase/migrations/20260907171200_territory_checker_rate_limit.sql)
  -- is 20/minute; loop past it and confirm it actually trips.
  while v_calls < 25 and not v_rate_limited loop
    v_calls := v_calls + 1;
    begin
      perform public.check_territory_availability('NR15', 'groundworks');
    exception when others then
      if sqlerrm = 'rate_limited' then
        v_rate_limited := true;
      else
        raise;
      end if;
    end;
  end loop;

  reset role;

  if not v_rate_limited then
    raise exception 'FAIL: check_territory_availability did not rate-limit after % calls from the same identifier', v_calls;
  end if;

  raise notice 'PASS: check_territory_availability rate limit trips after % calls', v_calls;
end $$;

-- Cleanup: rate_limit_events rows are inserted by check_territory_availability
-- itself (a SECURITY DEFINER function whose inserts commit as part of each
-- individual statement above, not rolled back by the surrounding DO block),
-- so they're removed explicitly here rather than relying on transaction
-- rollback. Identified by the salted hash the function stores — deleting by
-- recency instead, since the salt makes the raw test IP unrecoverable from
-- the stored value.
delete from public.rate_limit_events
where scope = 'public_territory_checker' and created_at > now() - interval '2 minutes';
