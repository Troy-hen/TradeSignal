-- First-plan trust offer: a time-limited platform trial with a small,
-- deterministic number of free lead unlocks. Credits are recorded on the
-- unlock itself so billing/reporting never needs to infer a free purchase.
alter table public.coverage_plans
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_lead_unlock_limit integer not null default 3,
  add column if not exists trial_lead_unlocks_used integer not null default 0,
  add column if not exists trial_lead_unlocks_used_at timestamptz;

alter table public.lead_unlocks
  add column if not exists is_trial_credit boolean not null default false;

create or replace function public.claim_trial_lead_unlock(p_company_id uuid, p_lead_unlock_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  if auth.role() <> 'service_role' and not exists (
    select 1 from public.company_memberships cm
    where cm.company_id = p_company_id and cm.user_id = auth.uid() and cm.status = 'active'
  ) then
    return false;
  end if;

  update public.coverage_plans
  set trial_lead_unlocks_used = trial_lead_unlocks_used + 1,
      trial_lead_unlocks_used_at = now(),
      updated_at = now()
  where company_id = p_company_id
    and status in ('active', 'suspended')
    and trial_started_at is not null
    and trial_started_at > now() - interval '14 days'
    and trial_lead_unlocks_used < trial_lead_unlock_limit
  returning id into v_plan_id;

  if v_plan_id is null then return false; end if;

  update public.lead_unlocks
  set status = 'paid', is_trial_credit = true, unlocked_at = now(), updated_at = now()
  where id = p_lead_unlock_id and company_id = p_company_id and status = 'pending';

  if not found then
    update public.coverage_plans
    set trial_lead_unlocks_used = greatest(0, trial_lead_unlocks_used - 1), updated_at = now()
    where id = v_plan_id;
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.claim_trial_lead_unlock(uuid, uuid) from public, anon;
grant execute on function public.claim_trial_lead_unlock(uuid, uuid) to authenticated;

comment on column public.coverage_plans.trial_lead_unlock_limit is 'Number of no-charge lead unlock credits included in the first 14-day platform trial.';
comment on column public.lead_unlocks.is_trial_credit is 'True when this unlock consumed a platform trial credit instead of a £20 charge.';
