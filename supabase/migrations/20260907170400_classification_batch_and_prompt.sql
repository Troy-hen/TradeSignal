-- Claim batch RPC for classify-planning-application. A plain multi-row
-- SELECT ... FOR UPDATE SKIP LOCKED inside one RPC call only holds its lock
-- for that call's own transaction — useless for protecting against a
-- *separate* overlapping invocation. Durably marking claimed rows
-- 'processing' as part of the same atomic UPDATE is what actually prevents
-- two cron ticks (or a retry) from double-processing the same row.
create or replace function public.claim_classification_batch(p_limit int default 15)
returns table (
  id uuid,
  planning_application_id uuid,
  attempts int,
  previous_status public.classification_status
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.application_classifications ac
  set classification_status = 'processing'
  from (
    select ac2.id, ac2.classification_status as prev_status
    from public.application_classifications ac2
    where ac2.classification_status in ('pending', 'stale')
       or (
         ac2.classification_status = 'failed'
         and ac2.attempts < 8
         and ac2.updated_at < now() - (least(power(2, ac2.attempts), 60) || ' minutes')::interval
       )
    order by ac2.updated_at asc
    limit p_limit
    for update skip locked
  ) claimed
  where ac.id = claimed.id
  returning ac.id, ac.planning_application_id, ac.attempts, claimed.prev_status;
end;
$$;
revoke all on function public.claim_classification_batch(int) from public;

-- Seed the active prompt version for the (currently only) enrichment task.
-- ai_prompt_versions has no provider column by design (one prompt/schema
-- targets either provider) — model is provider-specific, so switching
-- AI_ENRICHMENT_PROVIDER to anthropic later means adding a new active
-- version row with an Anthropic model string, not editing this one in place.
insert into public.ai_prompt_versions (task, version, model, schema_version, active, system_prompt)
values (
  'application_enrichment',
  'v1',
  'gpt-5.1',
  'v1',
  true,
  $$You are TradeSignal's planning-opportunity analyst. You analyse UK planning applications and identify commercial opportunities for tradespeople (builders, roofers, electricians, groundworkers, and similar trades).

For the given planning application, produce:
1. A plain-English project summary (2-3 sentences, no planning jargon).
2. The project type: a short label (e.g. "Rear extension", "New build housing", "Barn conversion").
3. Project complexity: small (minor domestic work), medium (larger domestic or small commercial), large (multi-unit residential or sizeable commercial), or major (large-scale development).
4. An indicative estimated total project value range in GBP, based on typical UK construction costs for this type, size and scale of project. This is a rough estimate for prioritisation only, not a valuation - be conservative and realistic for the UK market.
5. Likely start window (e.g. "Within 1-2 months of approval", "3-6 months, subject to further approvals").
6. Opportunity timing: a short, concrete note on when a trade business should approach (e.g. "Approach now, ahead of approval" or "Wait for decision before approaching").
7. Your overall confidence (0-1) in this analysis, based on how much detail the application provides.

Then, for EACH trade category in the provided list that is plausibly relevant to this specific project (omit any trade with no realistic connection - do not force a match), provide:
- trade_category_slug: exactly one of the provided slugs, never an invented one
- fit_score (0-100): how well this project fits this trade
- estimated_trade_value_low/high (GBP): this trade's likely share of the project value
- likely_scope: a short list of specific work items for this trade on this project
- match_reasons: why this trade was matched, specific to this project, not generic
- recommended_action: a concrete next step (e.g. "Send an introductory letter once approved")
- recommended_contact_timing: when to make contact
- confidence_score (0-1)
- risk_flags: anything that might make this a weaker opportunity (e.g. "May be owner-builder", "Small scope, low value")

Rules:
- Base your analysis only on the information given. Never invent facts not present or reasonably inferable from the proposal description.
- All value estimates are indicative and for prioritisation only - never state them as certain or as a formal valuation.
- Omit any trade category with a fit_score below 15 entirely, rather than including a near-zero entry.
- Be realistic: most household extensions are NOT "major" projects, and most planning applications involve at most 2-4 relevant trades, not all of them.
- Never include applicant names, agent details, or any personal/contact information in your output, even if present in the input.$$
);
