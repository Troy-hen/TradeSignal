-- "Current state" (New/Saved/Contacted/Quoted/Won/Lost) is deliberately
-- derived from the latest lead_actions row per lead_match, not a separate
-- mutable status column — this view is that derivation, reused by the
-- dashboard overview, opportunities list, and ROI page instead of each
-- re-implementing "latest action per match".
--
-- security_invoker=true is required: without it, a view runs with its
-- owner's privileges (bypassing RLS on lead_matches/lead_actions), which
-- would leak every company's data to every caller.
create view public.lead_match_current_state
with (security_invoker = true) as
select
  lm.id as lead_match_id,
  lm.company_id,
  lm.application_trade_opportunity_id,
  lm.matched_at,
  lm.viewed_at,
  la.action_type as current_action,
  la.contract_value_gbp as current_contract_value_gbp,
  la.created_at as current_action_at
from public.lead_matches lm
left join lateral (
  select action_type, contract_value_gbp, created_at
  from public.lead_actions
  where lead_match_id = lm.id
  order by created_at desc
  limit 1
) la on true;

grant select on public.lead_match_current_state to authenticated;
