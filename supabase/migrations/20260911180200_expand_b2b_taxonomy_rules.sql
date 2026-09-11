update public.intelligence_need_rules r set market_id=nc.market_id,updated_at=now()
from public.need_categories nc where r.need_category_id=nc.id and r.market_id is distinct from nc.market_id;

with taxonomy_rule_scope(market_slug,signal_family,category_group,match_weight) as (
  values
  ('moves_fitouts','moves_fitouts','digital_marketing',0.58),('moves_fitouts','moves_fitouts','software_technology',0.60),('moves_fitouts','moves_fitouts','professional_advisory',0.56),('moves_fitouts','moves_fitouts','finance_operations',0.58),('moves_fitouts','moves_fitouts','premises_facilities',0.62),('moves_fitouts','moves_fitouts','communications_utilities',0.60),('moves_fitouts','moves_fitouts','supply_chain_logistics',0.52),('moves_fitouts','moves_fitouts','sector_specialist',0.52),('moves_fitouts','moves_fitouts','construction_property',0.62),
  ('hospitality_openings','hospitality_openings','digital_marketing',0.62),('hospitality_openings','hospitality_openings','software_technology',0.66),('hospitality_openings','hospitality_openings','professional_advisory',0.54),('hospitality_openings','hospitality_openings','finance_operations',0.58),('hospitality_openings','hospitality_openings','premises_facilities',0.62),('hospitality_openings','hospitality_openings','communications_utilities',0.60),('hospitality_openings','hospitality_openings','supply_chain_logistics',0.54),('hospitality_openings','hospitality_openings','sector_specialist',0.65),
  ('care_health','care_health','digital_marketing',0.54),('care_health','care_health','software_technology',0.63),('care_health','care_health','professional_advisory',0.58),('care_health','care_health','finance_operations',0.58),('care_health','care_health','premises_facilities',0.62),('care_health','care_health','communications_utilities',0.60),('care_health','care_health','sector_specialist',0.65),
  ('commercial_energy','commercial_energy','software_technology',0.56),('commercial_energy','commercial_energy','professional_advisory',0.60),('commercial_energy','commercial_energy','finance_operations',0.52),('commercial_energy','commercial_energy','premises_facilities',0.68),('commercial_energy','commercial_energy','communications_utilities',0.76),('commercial_energy','commercial_energy','sector_specialist',0.56),
  ('growing_businesses','growing_businesses','digital_marketing',0.60),('growing_businesses','growing_businesses','software_technology',0.68),('growing_businesses','growing_businesses','professional_advisory',0.58),('growing_businesses','growing_businesses','finance_operations',0.66),('growing_businesses','growing_businesses','premises_facilities',0.54),('growing_businesses','growing_businesses','communications_utilities',0.56),('growing_businesses','growing_businesses','supply_chain_logistics',0.52),
  ('public_contracts','public_contracts','digital_marketing',0.52),('public_contracts','public_contracts','software_technology',0.62),('public_contracts','public_contracts','professional_advisory',0.68),('public_contracts','public_contracts','finance_operations',0.56),('public_contracts','public_contracts','premises_facilities',0.62),('public_contracts','public_contracts','communications_utilities',0.56),('public_contracts','public_contracts','supply_chain_logistics',0.60),('public_contracts','public_contracts','sector_specialist',0.60)
),scope_rules as (
  select format('taxonomy_%s_%s_%s',s.market_slug,s.signal_family,nc.slug) rule_key,
    s.market_slug,s.signal_family,nc.slug need_slug,s.match_weight,sc.slug supplier_slug
  from taxonomy_rule_scope s
  join public.opportunity_markets om on om.slug=s.market_slug
  join public.supplier_categories sc on sc.category_group=s.category_group and sc.is_active
  join public.need_categories nc on nc.market_id=om.id
    and (replace(sc.slug,'-','_')=nc.slug or (sc.slug='fit-out-interiors' and nc.slug='commercial_fit_out'))
    and nc.is_active
),rule_payload as (
  select sr.rule_key,om.id market_id,null::text event_type,null::text signal_type,sr.signal_family,nc.id need_category_id,
    coalesce((select array_agg(value order by ordinality)
      from jsonb_array_elements_text(coalesce(tc.ai_detection_hints->'keywords','[]'::jsonb)) with ordinality),'{}'::text[]) match_terms,
    sr.match_weight
  from scope_rules sr
  join public.opportunity_markets om on om.slug=sr.market_slug
  join public.need_categories nc on nc.market_id=om.id and nc.slug=sr.need_slug
  join public.supplier_categories sc on sc.slug=sr.supplier_slug
  join public.trade_categories tc on tc.id=sc.source_trade_category_id
)
insert into public.intelligence_need_rules(rule_key,market_id,event_type,signal_type,signal_family,need_category_id,match_terms,match_weight,is_active)
select rule_key,market_id,event_type,signal_type,signal_family,need_category_id,match_terms,match_weight,true from rule_payload
on conflict(rule_key) do update set market_id=excluded.market_id,event_type=excluded.event_type,signal_type=excluded.signal_type,signal_family=excluded.signal_family,need_category_id=excluded.need_category_id,match_terms=excluded.match_terms,match_weight=excluded.match_weight,is_active=true,updated_at=now();