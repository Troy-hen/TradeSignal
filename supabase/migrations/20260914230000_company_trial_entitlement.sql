-- Account-level first-plan trial. The trial belongs to the company, not to a
-- particular coverage shape, so the three included lead unlocks remain valid
-- if coverage is changed or expanded during the trial.
alter table public.companies
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_lead_unlock_limit integer not null default 3,
  add column if not exists trial_lead_unlocks_used integer not null default 0,
  add column if not exists trial_lead_unlocks_used_at timestamptz;

-- Preserve the first trial already created by the previous plan-scoped model.
with first_trial as (
  select distinct on (company_id)
    company_id,
    trial_started_at,
    trial_lead_unlock_limit,
    trial_lead_unlocks_used,
    trial_lead_unlocks_used_at
  from public.coverage_plans
  where trial_started_at is not null
  order by company_id, trial_started_at
)
update public.companies c
set trial_started_at = first_trial.trial_started_at,
    trial_ends_at = first_trial.trial_started_at + interval '14 days',
    trial_lead_unlock_limit = greatest(0, first_trial.trial_lead_unlock_limit),
    trial_lead_unlocks_used = greatest(0, first_trial.trial_lead_unlocks_used),
    trial_lead_unlocks_used_at = first_trial.trial_lead_unlocks_used_at,
    updated_at = now()
from first_trial
where c.id = first_trial.company_id
  and c.trial_started_at is null;

create or replace function public.claim_trial_lead_unlock(p_company_id uuid, p_lead_unlock_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  ) then
    return false;
  end if;

  -- The guarded update is the allocation lock: concurrent unlock requests
  -- cannot consume the same final credit.
  update public.companies
  set trial_lead_unlocks_used = trial_lead_unlocks_used + 1,
      trial_lead_unlocks_used_at = now(),
      updated_at = now()
  where id = p_company_id
    and trial_started_at is not null
    and trial_ends_at > now()
    and trial_lead_unlocks_used < trial_lead_unlock_limit;

  if not found then
    return false;
  end if;

  update public.lead_unlocks
  set status = 'paid',
      is_trial_credit = true,
      unlocked_at = now(),
      updated_at = now()
  where id = p_lead_unlock_id
    and company_id = p_company_id
    and status = 'pending';

  if not found then
    update public.companies
    set trial_lead_unlocks_used = greatest(0, trial_lead_unlocks_used - 1),
        updated_at = now()
    where id = p_company_id;
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.claim_trial_lead_unlock(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_trial_lead_unlock(uuid, uuid) to service_role;

comment on column public.companies.trial_ends_at is 'End of the company first-plan 14-day trial; no coverage subscription charge is due before this timestamp.';
comment on column public.companies.trial_lead_unlock_limit is 'Number of no-charge lead unlock credits included in the first platform trial.';
comment on column public.companies.trial_lead_unlocks_used is 'Trial lead credits atomically consumed by this company.';
comment on column public.lead_unlocks.is_trial_credit is 'True when this unlock consumed a company trial credit instead of a paid checkout.';
