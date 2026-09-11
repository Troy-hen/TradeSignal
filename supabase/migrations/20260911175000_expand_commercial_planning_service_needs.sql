-- Commercial planning is one buying window with several possible B2B
-- service needs. Keep the lead canonical and add the relevant service needs.
with rule_seed(rule_key, signal_type, market_slug, need_slug, match_terms, match_weight) as (
  values
    ('commercial_planning_workplace_furniture','commercial_planning_activity','moves_fitouts','office_workplace_furniture','{}'::text[],0.72),
    ('commercial_planning_managed_it','commercial_planning_activity','moves_fitouts','managed_it_services','{}'::text[],0.68),
    ('commercial_planning_connectivity','commercial_planning_activity','moves_fitouts','broadband_connectivity','{}'::text[],0.68),
    ('commercial_planning_signage','commercial_planning_activity','moves_fitouts','signage_branding','{}'::text[],0.60),
    ('commercial_planning_accountancy','commercial_planning_activity','moves_fitouts','accountancy_finance','{}'::text[],0.42),
    ('commercial_hospitality_managed_it','commercial_planning_activity','hospitality_openings','managed_it_services',array['restaurant','cafe','coffee','pub','bar','takeaway','hotel'],0.78)
)
insert into public.intelligence_need_rules (rule_key, signal_type, need_category_id, match_terms, match_weight)
select r.rule_key, r.signal_type, nc.id, r.match_terms, r.match_weight
from rule_seed r
join public.opportunity_markets om on om.slug=r.market_slug
join public.need_categories nc on nc.market_id=om.id and nc.slug=r.need_slug
on conflict (rule_key) do update set
  signal_type=excluded.signal_type, event_type=null, signal_family=null,
  need_category_id=excluded.need_category_id, match_terms=excluded.match_terms,
  match_weight=excluded.match_weight, is_active=true, updated_at=now();

with source_context as (
  select os.opportunity_id, os.signal_id, s.signal_type, s.signal_family,
    string_agg(lower(concat_ws(' ', o.title, o.why_now, o.likely_requirements::text, s.interpretation::text, ev.factual_data::text)), ' ') as context
  from public.opportunity_signals os
  join public.opportunities o on o.id=os.opportunity_id
  join public.signals s on s.id=os.signal_id
  left join public.signal_evidence se on se.signal_id=s.id
  left join public.events ev on ev.id=se.event_id
  group by os.opportunity_id, os.signal_id, s.signal_type, s.signal_family
)
insert into public.opportunity_needs (opportunity_id, need_category_id, relevance, evidence)
select c.opportunity_id,r.need_category_id,r.match_weight,
  jsonb_build_object('match_method','intelligence_need_rule_backfill','rule_key',r.rule_key,'signal_id',c.signal_id)
from source_context c
join public.intelligence_need_rules r on r.is_active
  and (r.signal_type is null or r.signal_type=c.signal_type)
  and (r.signal_family is null or r.signal_family=c.signal_family)
  and r.event_type is null
  and (coalesce(cardinality(r.match_terms),0)=0 or exists (
    select 1 from unnest(r.match_terms) term where c.context like '%'||lower(term)||'%'
  ))
on conflict (opportunity_id,need_category_id) do update set
  relevance=greatest(public.opportunity_needs.relevance,excluded.relevance),
  evidence=excluded.evidence;
