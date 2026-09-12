-- Deterministic opportunity scoring: additive base x two multiplicative gates.
-- Lives in the DB (not the LLM, not application code) because it must react
-- to changes on three different tables and must be a stored, indexed column
-- the dashboard can ORDER BY.

create or replace function public.compute_opportunity_score(
  p_fit_score numeric,
  p_project_size public.project_size_category,
  p_trade_value_high numeric,
  p_status public.planning_application_status,
  p_decision_date date,
  p_received_date date,
  p_ai_confidence numeric
)
returns table (score numeric, bucket public.opportunity_bucket)
language plpgsql
immutable
as $$
declare
  v_trade_fit numeric := coalesce(p_fit_score, 0);
  v_project_size numeric := case p_project_size
    when 'small' then 30 when 'medium' then 60 when 'large' then 85 when 'major' then 100
    else 50 end;
  v_trade_value numeric;
  v_recency numeric;
  v_days_elapsed numeric;
  v_stage_multiplier numeric;
  v_confidence_multiplier numeric := 0.5 + coalesce(p_ai_confidence, 0.6) * 0.5;
  v_base numeric;
  v_final numeric;
begin
  if p_trade_value_high is not null and p_trade_value_high > 0 then
    v_trade_value := least(100, ln(p_trade_value_high + 1) / ln(150000) * 100);
  else
    v_trade_value := v_project_size;
  end if;

  v_days_elapsed := greatest(0, extract(epoch from (now() - coalesce(p_decision_date, p_received_date, current_date))) / 86400);
  v_recency := 100 * exp(-ln(2) * v_days_elapsed / 45);

  v_stage_multiplier := case p_status
    when 'approved' then 1.15
    when 'decision_expected' then 1.0
    when 'under_consideration' then 0.9
    when 'appeal_lodged' then 0.85
    when 'validated' then 0.75
    when 'unknown' then 0.7
    when 'submitted' then 0.6
    when 'withdrawn' then 0.05
    when 'rejected' then 0.05
    else 0.7
  end;

  v_base := 0.35 * v_trade_fit + 0.25 * v_trade_value + 0.15 * v_project_size + 0.25 * v_recency;
  v_final := greatest(0, least(100, v_base * v_stage_multiplier * v_confidence_multiplier));

  return query select
    round(v_final, 2),
    case
      when v_final >= 75 then 'hot'::public.opportunity_bucket
      when v_final >= 50 then 'strong'::public.opportunity_bucket
      when v_final >= 25 then 'possible'::public.opportunity_bucket
      else 'low'::public.opportunity_bucket
    end;
end;
$$;

-- BEFORE trigger: recomputes on every insert/update of the opportunity row
-- itself, and — because it re-reads the parent application's current
-- status/decision_date — on any "touch" update fired by the cascading
-- triggers below. Also flips is_active=false on withdrawn/rejected,
-- regardless of trade relevance.
create or replace function public.trg_score_application_trade_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.planning_application_status;
  v_decision_date date;
  v_received_date date;
  v_project_size public.project_size_category;
  v_result record;
begin
  select status, decision_date, received_date into v_status, v_decision_date, v_received_date
  from public.planning_applications where id = new.planning_application_id;

  select project_size_category into v_project_size
  from public.application_classifications where id = new.application_classification_id;

  select * into v_result from public.compute_opportunity_score(
    new.fit_score, v_project_size, new.estimated_trade_value_high,
    v_status, v_decision_date, v_received_date, new.ai_confidence
  );

  new.opportunity_score := v_result.score;
  new.opportunity_bucket := v_result.bucket;
  new.score_formula_version := 'v1';
  new.score_computed_at := now();

  if v_status in ('withdrawn', 'rejected') then
    new.is_active := false;
  end if;

  return new;
end;
$$;

create trigger trg_score_before_upsert
  before insert or update on public.application_trade_opportunities
  for each row execute function public.trg_score_application_trade_opportunity();

-- Cascades: a status/decision-date change on the application, or a confidence
-- change on its classification, "touches" every child opportunity row so the
-- BEFORE trigger above recomputes with fresh inputs. This is the structural
-- mechanism behind "an application becomes APPROVED -> re-evaluate urgency."
create or replace function public.trg_rescore_on_application_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.application_trade_opportunities
  set updated_at = now()
  where planning_application_id = new.id;
  return new;
end;
$$;

create trigger trg_rescore_on_status_or_decision_change
  after update of status, decision_date on public.planning_applications
  for each row
  when (old.status is distinct from new.status or old.decision_date is distinct from new.decision_date)
  execute function public.trg_rescore_on_application_change();

create or replace function public.trg_rescore_on_classification_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.application_trade_opportunities
  set updated_at = now()
  where application_classification_id = new.id;
  return new;
end;
$$;

create trigger trg_rescore_on_confidence_change
  after update of ai_confidence on public.application_classifications
  for each row
  when (old.ai_confidence is distinct from new.ai_confidence)
  execute function public.trg_rescore_on_classification_change();

-- Daily sweep: recency decays continuously even with zero data change, so a
-- score computed on day 1 would otherwise stay frozen indefinitely.
create or replace function public.rescore_stale_opportunities()
returns void
language sql
security definer
set search_path = public
as $$
  update public.application_trade_opportunities
  set updated_at = now()
  where is_active = true
    and planning_application_id in (
      select id from public.planning_applications
      where updated_at > now() - interval '180 days'
    );
$$;
revoke all on function public.rescore_stale_opportunities() from public;

select cron.schedule(
  'rescore-stale-opportunities',
  '0 4 * * *',
  $$select public.rescore_stale_opportunities();$$
);
