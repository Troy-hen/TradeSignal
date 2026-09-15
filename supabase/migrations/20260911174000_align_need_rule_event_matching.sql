-- Align signal-only need rules with providers that retain a generic
-- factual event type while publishing a normalized commercial signal type.
update public.intelligence_need_rules
set event_type = null, updated_at = now()
where rule_key in (
  'planning_fitout','planning_workplace_furniture','planning_managed_it',
  'planning_connectivity','planning_signage','planning_accountancy',
  'commercial_hospitality_epos','commercial_hospitality_kitchen',
  'commercial_hospitality_connectivity','commercial_hospitality_signage'
);

with source_context as (
  select os.opportunity_id, os.signal_id, s.signal_type, s.signal_family,
    string_agg(lower(concat_ws(' ', o.title, o.why_now, o.likely_requirements::text, s.interpretation::text, ev.factual_data::text)), ' ') as context
  from public.opportunity_signals os
  join public.opportunities o on o.id = os.opportunity_id
  join public.signals s on s.id = os.signal_id
  left join public.signal_evidence se on se.signal_id = s.id
  left join public.events ev on ev.id = se.event_id
  group by os.opportunity_id, os.signal_id, s.signal_type, s.signal_family
)
insert into public.opportunity_needs (opportunity_id, need_category_id, relevance, evidence)
select c.opportunity_id, r.need_category_id, r.match_weight,
  jsonb_build_object('match_method','intelligence_need_rule_backfill','rule_key',r.rule_key,'signal_id',c.signal_id)
from source_context c
join public.intelligence_need_rules r on r.is_active
  and (r.signal_type is null or r.signal_type = c.signal_type)
  and (r.signal_family is null or r.signal_family = c.signal_family)
  and r.event_type is null
  and (coalesce(cardinality(r.match_terms), 0) = 0 or exists (
    select 1 from unnest(r.match_terms) term where c.context like '%' || lower(term) || '%'
  ))
on conflict (opportunity_id, need_category_id) do update set
  relevance = greatest(public.opportunity_needs.relevance, excluded.relevance),
  evidence = excluded.evidence;
