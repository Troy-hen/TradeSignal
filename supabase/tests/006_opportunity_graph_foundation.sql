-- Phase 1 graph smoke test. Run after the opportunity-graph migration against
-- the cloned TradeSignal project. This test is read-only and never creates
-- fixtures or mutates production rows.

do $$
declare
  v_markets integer;
  v_source_records integer;
  v_events integer;
  v_signals integer;
  v_opportunities integer;
  v_scored integer;
begin
  select count(*) into v_markets from public.opportunity_markets where is_active;
  if v_markets < 6 then
    raise exception 'FAIL: expected six active opportunity markets, got %', v_markets;
  end if;

  select count(*) into v_source_records from public.source_records;
  select count(*) into v_events from public.events;
  select count(*) into v_signals from public.signals;
  select count(*) into v_opportunities from public.opportunities;
  select count(*) into v_scored from public.opportunity_scores;

  if v_source_records = 0 or v_events = 0 or v_signals = 0 then
    raise exception 'FAIL: graph bridge did not materialise source records, events and signals';
  end if;
  if v_opportunities = 0 or v_scored <> v_opportunities then
    raise exception 'FAIL: expected every graph opportunity to have one v1 score (opportunities=%, scores=%)', v_opportunities, v_scored;
  end if;

  if exists (
    select 1
    from public.opportunities o
    join public.source_records sr on sr.id = (o.source_attribution ->> 'source_record_id')::uuid
    where sr.is_fixture and coalesce((o.source_attribution ->> 'is_fixture')::boolean, false) is false
  ) then
    raise exception 'FAIL: fixture source data was promoted without preserving its fixture flag';
  end if;

  raise notice 'PASS: opportunity graph foundation source=% events=% signals=% opportunities=% scores=%',
    v_source_records, v_events, v_signals, v_opportunities, v_scored;
end $$;
